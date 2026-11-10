// Runs only when TEST_DATABASE_URL points at a dedicated, migrated PostgreSQL test database
// (see tests/helpers/testDatabase.js). Every test runs inside a transaction that is rolled back.
//
// These tests prove what the fake client in users.cli.test.js cannot: that the SQL works, and that
// creating a user or changing a password leaves device keys and telemetry exactly as they were.
import { after, before, beforeEach, afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { verifyPassword } from "../src/auth/passwords.js";
import { generateApiKey, hashApiKey } from "../src/auth/apiKeys.js";
import { parseCreateArgs, parseSetPasswordArgs, runUserCreate, runUserSetPassword } from "../src/users/cli.js";
import { refusalReason } from "./helpers/testDatabase.js";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set";

const FIRST = "correct horse battery";
const SECOND = "another long passphrase";

// The commands open their own transaction. Inside the test's outer one, BEGIN/COMMIT/ROLLBACK
// become a savepoint, so nothing the command "commits" survives the test.
function inSavepoint(client) {
  const map = { BEGIN: "SAVEPOINT user_cmd", COMMIT: "RELEASE SAVEPOINT user_cmd", ROLLBACK: "ROLLBACK TO SAVEPOINT user_cmd" };
  return { query: (text, params) => client.query(map[text] ?? text, params) };
}

function typing(...answers) {
  const queue = [...answers];
  return async () => queue.shift();
}

describe("user commands against PostgreSQL", { skip }, () => {
  let client;

  before(async () => {
    if (skip) return;
    const reason = refusalReason(url);
    if (reason) throw new Error(`Refusing to run integration tests: ${reason}`);
    client = await getPool(loadConfig({ DATABASE_URL: url })).connect();
  });

  after(async () => {
    client?.release();
    await closePool();
  });

  beforeEach(() => client?.query("BEGIN"));
  afterEach(() => client?.query("ROLLBACK"));

  async function fixture() {
    const nodes = await client.query("INSERT INTO nodes (code) VALUES ('itest-u1'), ('itest-u2') RETURNING id, code");
    const nodeId = Object.fromEntries(nodes.rows.map((r) => [r.code, r.id]));
    await client.query("INSERT INTO device_credentials (api_key_hash, node_id) VALUES ($1, $2)", [
      hashApiKey(generateApiKey()),
      nodeId["itest-u1"],
    ]);
    await client.query("INSERT INTO telemetry_records (node_id, raw_registers) VALUES ($1, $2::integer[])", [
      nodeId["itest-u1"],
      [1, 2, 3, 4, 5, 6, 7],
    ]);
    return { nodeId, db: inSavepoint(client) };
  }

  // Everything the commands must not change, as one comparable value.
  async function untouched() {
    const keys = await client.query(
      "SELECT api_key_hash, node_id, revoked_at FROM device_credentials ORDER BY api_key_hash",
    );
    const telemetry = await client.query(
      "SELECT id, node_id, received_at, raw_registers FROM telemetry_records ORDER BY id",
    );
    const config = await client.query("SELECT * FROM node_config ORDER BY node_id");
    return { keys: keys.rows, telemetry: telemetry.rows, config: config.rows };
  }

  async function userRow(email) {
    const { rows } = await client.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [email]);
    return rows[0];
  }

  async function assignedNodes(userId) {
    const { rows } = await client.query(
      "SELECT n.code FROM user_nodes un JOIN nodes n ON n.id = un.node_id WHERE un.user_id = $1 ORDER BY n.code",
      [userId],
    );
    return rows.map((r) => r.code);
  }

  test("create stores a lowercase email, a working hash, the role and only the given nodes", async () => {
    const { db } = await fixture();
    const before = await untouched();
    const args = parseCreateArgs(["--email", "Itest.Viewer@SoilMon.Test", "--role", "viewer", "--node", "itest-u2"]);
    await runUserCreate({ args, client: db, readPassword: typing(FIRST, FIRST), log: () => {} });

    const user = await userRow("itest.viewer@soilmon.test");
    assert.equal(user.role, "viewer");
    assert.equal(await verifyPassword(FIRST, user.password_hash), true);
    assert.deepEqual(await assignedNodes(user.id), ["itest-u2"]);
    assert.deepEqual(await untouched(), before);
  });

  test("create for an admin writes no node rows", async () => {
    const { db } = await fixture();
    const args = parseCreateArgs(["--email", "itest.admin@soilmon.test", "--role", "admin"]);
    await runUserCreate({ args, client: db, readPassword: typing(FIRST, FIRST), log: () => {} });
    const user = await userRow("itest.admin@soilmon.test");
    assert.equal(user.role, "admin");
    assert.deepEqual(await assignedNodes(user.id), []);
  });

  test("create refuses an existing email and an unknown node, writing nothing", async () => {
    const { db } = await fixture();
    const make = (extra = []) => parseCreateArgs(["--email", "itest.dup@soilmon.test", "--role", "viewer", ...extra]);
    await runUserCreate({ args: make(["--node", "itest-u1"]), client: db, readPassword: typing(FIRST, FIRST), log: () => {} });
    const first = await userRow("itest.dup@soilmon.test");

    await assert.rejects(
      runUserCreate({ args: make(), client: db, readPassword: typing(SECOND, SECOND), log: () => {} }),
      /already exists/,
    );
    const same = await userRow("itest.dup@soilmon.test");
    assert.equal(same.password_hash, first.password_hash);

    const ghost = parseCreateArgs(["--email", "itest.ghost@soilmon.test", "--role", "viewer", "--node", "itest-u1", "--node", "nope-1"]);
    await assert.rejects(
      runUserCreate({ args: ghost, client: db, readPassword: typing(FIRST, FIRST), log: () => {} }),
      /Unknown node/,
    );
    assert.equal(await userRow("itest.ghost@soilmon.test"), undefined);
  });

  test("set-password changes only the hash: role, nodes, device keys, telemetry and config stay", async () => {
    const { db, nodeId } = await fixture();
    const create = parseCreateArgs(["--email", "itest.keep@soilmon.test", "--role", "viewer", "--node", "itest-u1"]);
    await runUserCreate({ args: create, client: db, readPassword: typing(FIRST, FIRST), log: () => {} });
    await client.query("INSERT INTO node_config (node_id, pump_duration_sec) VALUES ($1, 30)", [nodeId["itest-u1"]]);
    const before = await userRow("itest.keep@soilmon.test");
    const untouchedBefore = await untouched();

    const args = parseSetPasswordArgs(["--email", "ITEST.KEEP@soilmon.test"]);
    await runUserSetPassword({ args, client: db, readPassword: typing(SECOND, SECOND), log: () => {} });

    const after = await userRow("itest.keep@soilmon.test");
    assert.equal(after.id, before.id);
    assert.equal(after.role, "viewer");
    assert.equal(await verifyPassword(SECOND, after.password_hash), true);
    assert.equal(await verifyPassword(FIRST, after.password_hash), false);
    assert.deepEqual(await assignedNodes(after.id), ["itest-u1"]);
    assert.deepEqual(await untouched(), untouchedBefore);
    const { rows } = await client.query("SELECT count(*)::int AS n FROM device_credentials WHERE revoked_at IS NOT NULL");
    assert.equal(rows[0].n, untouchedBefore.keys.filter((k) => k.revoked_at !== null).length);
  });

  test("set-password for an email that does not exist changes nothing", async () => {
    const { db } = await fixture();
    const before = await client.query("SELECT email, password_hash FROM users ORDER BY email");
    const args = parseSetPasswordArgs(["--email", "itest.nobody@soilmon.test"]);
    await assert.rejects(
      runUserSetPassword({ args, client: db, readPassword: typing(FIRST, FIRST), log: () => {} }),
      /No user with email/,
    );
    const after = await client.query("SELECT email, password_hash FROM users ORDER BY email");
    assert.deepEqual(after.rows, before.rows);
  });
});
