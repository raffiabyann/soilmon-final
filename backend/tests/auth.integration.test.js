// Runs only when TEST_DATABASE_URL points at a dedicated, migrated PostgreSQL test database.
// Every test runs inside a transaction that is rolled back, so no data is kept.
//
// These tests prove what the route tests can only assume: that ownership and the admin role are
// enforced by the SQL itself.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { createApp } from "../src/app.js";
import { createTelemetryStore } from "../src/telemetry/store.js";
import { createAuthStore } from "../src/auth/store.js";
import { createNodeConfigStore } from "../src/nodeConfig/store.js";
import { hashPassword } from "../src/auth/passwords.js";
import { generateApiKey, hashApiKey } from "../src/auth/apiKeys.js";
import { refusalReason } from "./helpers/testDatabase.js";

const url = process.env.TEST_DATABASE_URL;
// Skipping each test (not the suite) makes the test runner count them as skipped.
const skip = url ? false : "TEST_DATABASE_URL is not set";

const SECRET = "integration-secret-at-least-32-chars";
const PASSWORD = "itest-password";
const HISTORY = { limit: 10, from: null, to: null };
const REGISTERS = [1, 2, 3, 4, 5, 6, 7];

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

describe("authorisation against PostgreSQL", () => {
  let client;
  let passwordHash;

  before(async () => {
    if (skip) return;
    // Checked before any connection is opened.
    const reason = refusalReason(url);
    if (reason) throw new Error(`Refusing to run integration tests: ${reason}`);
    client = await getPool(loadConfig({ DATABASE_URL: url })).connect();
    passwordHash = await hashPassword(PASSWORD, 4);
  });

  after(async () => {
    client?.release();
    await closePool();
  });

  // viewer A owns itest-a, viewer B owns itest-b, the admin owns nothing and reads everything.
  async function fixture() {
    const nodes = await client.query(
      "INSERT INTO nodes (code) VALUES ('itest-a'), ('itest-b') RETURNING id, code",
    );
    const nodeId = Object.fromEntries(nodes.rows.map((r) => [r.code, r.id]));

    const users = {};
    for (const [name, role] of [["viewerA", "viewer"], ["viewerB", "viewer"], ["admin", "admin"]]) {
      const email = `itest-${name.toLowerCase()}@soilmon.test`;
      const { rows } = await client.query(
        "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
        [email, passwordHash, role],
      );
      users[name] = { id: rows[0].id, role, email };
    }
    await client.query("INSERT INTO user_nodes (user_id, node_id) VALUES ($1, $2), ($3, $4)", [
      users.viewerA.id,
      nodeId["itest-a"],
      users.viewerB.id,
      nodeId["itest-b"],
    ]);

    const keys = { "itest-a": generateApiKey(), "itest-b": generateApiKey(), revoked: generateApiKey() };
    await client.query(
      `INSERT INTO device_credentials (api_key_hash, node_id, revoked_at)
       VALUES ($1, $2, NULL), ($3, $4, NULL), ($5, $2, now())`,
      [hashApiKey(keys["itest-a"]), nodeId["itest-a"], hashApiKey(keys["itest-b"]), nodeId["itest-b"], hashApiKey(keys.revoked)],
    );
    await client.query(
      `INSERT INTO telemetry_records (node_id, raw_registers) VALUES ($1, $3::integer[]), ($2, $3::integer[])`,
      [nodeId["itest-a"], nodeId["itest-b"], REGISTERS],
    );

    const as = (name) => ({ id: users[name].id, role: users[name].role });
    return { nodeId, users, keys, as };
  }

  async function inRollback(fn) {
    await client.query("BEGIN");
    try {
      await fn(await fixture());
    } finally {
      await client.query("ROLLBACK");
    }
  }

  // Answers like the client, but removes viewer A's assignment right after the first query: the
  // access check has passed, so only the ownership condition in the data query stands between
  // the caller and the data. This is what happens if a route forgot to act on the first check.
  function revokeAfterAccessCheck(userId) {
    let first = true;
    return {
      async query(text, params) {
        const result = await client.query(text, params);
        if (first) {
          first = false;
          await client.query("DELETE FROM user_nodes WHERE user_id = $1", [userId]);
        }
        return result;
      },
    };
  }

  describe("telemetry store", () => {
    test("a viewer's node list contains only its own nodes; an admin's contains all", { skip }, () =>
      inRollback(async ({ as }) => {
        const store = createTelemetryStore(client);
        const codes = async (user) => (await store.listNodes(user)).map((n) => n.code);
        assert.deepEqual(await codes(as("viewerA")), ["itest-a"]);
        assert.deepEqual(await codes(as("viewerB")), ["itest-b"]);
        const adminCodes = await codes(as("admin"));
        assert.ok(adminCodes.includes("itest-a") && adminCodes.includes("itest-b"));
      }));

    test("viewer A reads its own records, is denied viewer B's, and gets missing for no node", { skip }, () =>
      inRollback(async ({ as }) => {
        const store = createTelemetryStore(client);
        const own = await store.listRecords("itest-a", HISTORY, as("viewerA"));
        assert.equal(own.access, "granted");
        assert.equal(own.records.length, 1);
        assert.deepEqual(await store.listRecords("itest-b", HISTORY, as("viewerA")), { access: "denied" });
        assert.deepEqual(await store.listRecords("itest-none", HISTORY, as("viewerA")), { access: "missing" });
        assert.equal((await store.listRecords("itest-b", HISTORY, as("admin"))).records.length, 1);
      }));

    test("second layer: the records query returns nothing once ownership is gone", { skip }, () =>
      inRollback(async ({ as, users }) => {
        const store = createTelemetryStore(revokeAfterAccessCheck(users.viewerA.id));
        assert.deepEqual(await store.listRecords("itest-a", HISTORY, as("viewerA")), {
          access: "granted",
          records: [],
        });
      }));

    test("second layer: the node query returns nothing once ownership is gone", { skip }, () =>
      inRollback(async ({ as, users }) => {
        const store = createTelemetryStore(revokeAfterAccessCheck(users.viewerA.id));
        assert.deepEqual(await store.getNode("itest-a", as("viewerA")), { access: "denied" });
      }));
  });

  describe("node config store", () => {
    test("a viewer reads its own node's config as nulls and is denied another's", { skip }, () =>
      inRollback(async ({ as }) => {
        const store = createNodeConfigStore(client);
        const own = await store.getConfig("itest-a", as("viewerA"));
        assert.equal(own.access, "granted");
        assert.equal(own.config.pumpDurationSec, null);
        assert.deepEqual(await store.getConfig("itest-b", as("viewerA")), { access: "denied" });
      }));

    test("an admin's partial updates create the row and keep the other field", { skip }, () =>
      inRollback(async ({ as, users }) => {
        const store = createNodeConfigStore(client);
        await store.updateConfig("itest-a", { moistureThreshold: 400 }, as("admin"));
        const { config } = await store.updateConfig("itest-a", { pumpDurationSec: 30 }, as("admin"));
        assert.equal(config.moistureThreshold, 400);
        assert.equal(config.pumpDurationSec, 30);
        assert.equal(config.updatedBy, users.admin.id);
        const read = await store.getConfig("itest-a", as("viewerA"));
        assert.equal(read.config.pumpDurationSec, 30);
      }));

    test("second layer: the SQL writes nothing for a viewer, even for its own node", { skip }, () =>
      inRollback(async ({ as, nodeId }) => {
        const store = createNodeConfigStore(client);
        // Called directly, as if a route had forgotten requireAdmin.
        assert.deepEqual(await store.updateConfig("itest-a", { pumpDurationSec: 30 }, as("viewerA")), {
          access: "denied",
        });
        const { rows } = await client.query("SELECT count(*)::int AS n FROM node_config WHERE node_id = $1", [
          nodeId["itest-a"],
        ]);
        assert.equal(rows[0].n, 0);
      }));
  });

  describe("auth store and constraints", () => {
    test("finds users by email and only active device keys", { skip }, () =>
      inRollback(async ({ users, keys }) => {
        const store = createAuthStore(client);
        assert.equal((await store.findUserByEmail(users.admin.email)).role, "admin");
        assert.equal(await store.findUserByEmail("itest-nobody@soilmon.test"), null);
        assert.equal((await store.findActiveDevice(hashApiKey(keys["itest-a"]))).nodeCode, "itest-a");
        assert.equal(await store.findActiveDevice(hashApiKey(keys.revoked)), null);
      }));

    for (const [label, sql, params, code] of [
      ["an unknown role", "INSERT INTO users (email, password_hash, role) VALUES ($1, 'h', 'superuser')", ["itest-x@soilmon.test"], "23514"],
      ["an uppercase email", "INSERT INTO users (email, password_hash, role) VALUES ($1, 'h', 'viewer')", ["ITEST-X@soilmon.test"], "23514"],
      ["a duplicate email", "INSERT INTO users (email, password_hash, role) VALUES ($1, 'h', 'viewer')", ["itest-admin@soilmon.test"], "23505"],
      ["a plain-text API key", "INSERT INTO device_credentials (api_key_hash, node_id) SELECT $1, id FROM nodes WHERE code = 'itest-a'", ["plain-text-key"], "23514"],
      ["a negative pump duration", "INSERT INTO node_config (node_id, pump_duration_sec) SELECT id, $1 FROM nodes WHERE code = 'itest-a'", [-1], "23514"],
    ]) {
      test(`the database rejects ${label}`, { skip }, () =>
        inRollback(async () => {
          await client.query("SAVEPOINT bad_insert");
          await assert.rejects(client.query(sql, params), (err) => err.code === code);
          await client.query("ROLLBACK TO SAVEPOINT bad_insert");
        }));
    }
  });

  describe("HTTP end to end", () => {
    async function withApp(fn) {
      return inRollback(async (fx) => {
        const app = createApp({
          telemetryStore: createTelemetryStore(client),
          authStore: createAuthStore(client),
          nodeConfigStore: createNodeConfigStore(client),
          jwtSecret: SECRET,
        });
        const { server, baseUrl } = await listen(app);
        try {
          const login = async (email) => {
            const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, password: PASSWORD }),
            });
            return (await res.json()).data.accessToken;
          };
          await fn({ ...fx, baseUrl, login });
        } finally {
          await new Promise((resolve) => server.close(resolve));
        }
      });
    }

    test("viewer A: own node 200, viewer B's node 403, config PATCH 403", { skip }, () =>
      withApp(async ({ baseUrl, login, users }) => {
        const auth = { authorization: `Bearer ${await login(users.viewerA.email)}` };
        assert.equal((await fetch(`${baseUrl}/api/v1/nodes/itest-a/telemetry`, { headers: auth })).status, 200);
        assert.equal((await fetch(`${baseUrl}/api/v1/nodes/itest-b/telemetry`, { headers: auth })).status, 403);
        assert.equal((await fetch(`${baseUrl}/api/v1/nodes/itest-a/config`, { headers: auth })).status, 200);
        const patch = await fetch(`${baseUrl}/api/v1/nodes/itest-a/config`, {
          method: "PATCH",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ pumpDurationSec: 30 }),
        });
        assert.equal(patch.status, 403);
      }));

    test("admin: reads any node and PATCHes config", { skip }, () =>
      withApp(async ({ baseUrl, login, users }) => {
        const auth = { authorization: `Bearer ${await login(users.admin.email)}` };
        assert.equal((await fetch(`${baseUrl}/api/v1/nodes/itest-b/telemetry`, { headers: auth })).status, 200);
        const patch = await fetch(`${baseUrl}/api/v1/nodes/itest-b/config`, {
          method: "PATCH",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ pumpDurationSec: 45 }),
        });
        assert.equal(patch.status, 200);
        assert.equal((await patch.json()).data.pumpDurationSec, 45);
      }));

    test("device keys: own node 201, another node 403, revoked key 401", { skip }, () =>
      withApp(async ({ baseUrl, keys }) => {
        const send = (key, nodeCode) =>
          fetch(`${baseUrl}/api/v1/telemetry`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key },
            body: JSON.stringify({ nodeCode, rawRegisters: REGISTERS }),
          });
        assert.equal((await send(keys["itest-a"], "itest-a")).status, 201);
        assert.equal((await send(keys["itest-a"], "itest-b")).status, 403);
        assert.equal((await send(keys.revoked, "itest-a")).status, 401);
      }));
  });
});
