import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createAuthStore } from "../src/auth/store.js";
import { createNodeConfigStore } from "../src/nodeConfig/store.js";
import { validateLoginInput } from "../src/auth/validate.js";
import { validateConfigPatch } from "../src/nodeConfig/validate.js";
import { ApiError } from "../src/middleware/errors.js";

// Records each query and answers with the queued results in order.
function fakeDb(...results) {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params });
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next ?? { rows: [] };
    },
  };
}

const HOSTILE = "x'; DROP TABLE users; --";
const VIEWER = { id: "7", role: "viewer" };
const ADMIN = { id: "3", role: "admin" };
const OWNERSHIP = /'admin' OR EXISTS \(\s*SELECT 1 FROM user_nodes un/;

describe("auth store", () => {
  test("finds a user by email with the email as a parameter only", async () => {
    const db = fakeDb({ rows: [{ id: "3", email: "a@b.c", role: "admin", password_hash: "$2b$..." }] });
    const user = await createAuthStore(db).findUserByEmail(HOSTILE);
    assert.deepEqual(db.calls[0].params, [HOSTILE]);
    assert.doesNotMatch(db.calls[0].text, /DROP/);
    assert.deepEqual(user, { id: "3", email: "a@b.c", role: "admin", passwordHash: "$2b$..." });
  });

  test("returns null for an unknown email", async () => {
    assert.equal(await createAuthStore(fakeDb({ rows: [] })).findUserByEmail("x@y.z"), null);
  });

  test("finds only active device keys, by hash", async () => {
    const db = fakeDb({ rows: [{ node_id: "1", node_code: "node-01" }] });
    const device = await createAuthStore(db).findActiveDevice("ab".repeat(32));
    assert.deepEqual(db.calls[0].params, ["ab".repeat(32)]);
    assert.match(db.calls[0].text, /revoked_at IS NULL/);
    assert.deepEqual(device, { nodeId: "1", nodeCode: "node-01" });
  });

  test("maps an unreachable database to a 503", async () => {
    const err = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    await assert.rejects(
      createAuthStore(fakeDb(err)).findUserByEmail("x@y.z"),
      (e) => e instanceof ApiError && e.status === 503,
    );
  });
});

describe("node config store", () => {
  const ROW = {
    moisture_threshold: 412.5,
    pump_duration_sec: 30,
    updated_by: "3",
    updated_at: new Date("2026-11-05T00:00:00Z"),
  };

  test("reads with the ownership condition in the data query", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [ROW] });
    const result = await createNodeConfigStore(db).getConfig(HOSTILE, VIEWER);

    assert.deepEqual(db.calls[0].params, [HOSTILE, "viewer", "7"]);
    assert.deepEqual(db.calls[1].params, ["4", "viewer", "7"]);
    assert.match(db.calls[1].text, OWNERSHIP);
    for (const { text } of db.calls) assert.doesNotMatch(text, /DROP/);
    assert.deepEqual(result, {
      access: "granted",
      config: {
        nodeCode: HOSTILE,
        moistureThreshold: 412.5,
        pumpDurationSec: 30,
        updatedBy: "3",
        updatedAt: "2026-11-05T00:00:00.000Z",
      },
    });
  });

  test("a node without a config row reads as null values", async () => {
    const empty = { moisture_threshold: null, pump_duration_sec: null, updated_by: null, updated_at: null };
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [empty] });
    const { config } = await createNodeConfigStore(db).getConfig("node-01", VIEWER);
    assert.deepEqual(config, {
      nodeCode: "node-01",
      moistureThreshold: null,
      pumpDurationSec: null,
      updatedBy: null,
      updatedAt: null,
    });
  });

  test("does not read the config of a node that is not the caller's", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: false }] });
    assert.deepEqual(await createNodeConfigStore(db).getConfig("node-02", VIEWER), { access: "denied" });
    assert.equal(db.calls.length, 1);
  });

  test("an update sends only the fields that were given, with the admin condition in SQL", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [ROW] });
    const result = await createNodeConfigStore(db).updateConfig("node-01", { pumpDurationSec: 30 }, ADMIN);

    // nodeId, userId, role, moistureThreshold, set?, pumpDurationSec, set?
    assert.deepEqual(db.calls[1].params, ["4", "3", "admin", null, false, 30, true]);
    assert.match(db.calls[1].text, /\$3::text = 'admin'/);
    assert.match(db.calls[1].text, /ON CONFLICT \(node_id\) DO UPDATE/);
    assert.equal(result.access, "granted");
    assert.equal(result.config.updatedBy, "3");
  });

  test("a null value is sent as an explicit change, not as an omitted field", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [ROW] });
    await createNodeConfigStore(db).updateConfig("node-01", { moistureThreshold: null }, ADMIN);
    assert.deepEqual(db.calls[1].params, ["4", "3", "admin", null, true, null, false]);
  });

  test("an update the SQL refuses (a viewer that reached the store) is denied", async () => {
    // A viewer may read its own node, so access is granted; the upsert's admin condition then
    // writes nothing and returns no row.
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [] });
    const result = await createNodeConfigStore(db).updateConfig("node-01", { pumpDurationSec: 30 }, VIEWER);
    assert.deepEqual(db.calls[1].params.slice(0, 3), ["4", "7", "viewer"]);
    assert.deepEqual(result, { access: "denied" });
  });

  test("an update of a node that does not exist runs no write", async () => {
    const db = fakeDb({ rows: [] });
    assert.deepEqual(await createNodeConfigStore(db).updateConfig("ghost", { pumpDurationSec: 30 }, ADMIN), {
      access: "missing",
    });
    assert.equal(db.calls.length, 1);
  });
});

describe("validateLoginInput", () => {
  test("accepts an email and password and lowercases the email", () => {
    assert.deepEqual(validateLoginInput({ email: "Admin@SoilMon.local", password: "pw" }), {
      value: { email: "admin@soilmon.local", password: "pw" },
      errors: [],
    });
  });

  test("reports missing fields and unknown fields", () => {
    assert.deepEqual(
      validateLoginInput({ username: "x" }).errors.map((e) => e.field),
      ["username", "email", "password"],
    );
  });

  for (const body of [null, [], "text"]) {
    test(`rejects a body that is not an object: ${JSON.stringify(body)}`, () => {
      assert.deepEqual(validateLoginInput(body).errors.map((e) => e.field), ["body"]);
    });
  }

  test("rejects a password longer than bcrypt's 72 bytes, counted in bytes", () => {
    // 36 two-byte characters are 72 bytes; one more is over the limit.
    assert.deepEqual(validateLoginInput({ email: "a@b.c", password: "é".repeat(36) }).errors, []);
    assert.deepEqual(
      validateLoginInput({ email: "a@b.c", password: "é".repeat(37) }).errors.map((e) => e.field),
      ["password"],
    );
  });

  for (const email of ["", "no-at-sign", "a@", "@b", "a b@c.d", 42, `${"a".repeat(250)}@b.cd`]) {
    test(`rejects email ${JSON.stringify(email).slice(0, 30)}`, () => {
      assert.deepEqual(validateLoginInput({ email, password: "pw" }).errors.map((e) => e.field), ["email"]);
    });
  }
});

describe("validateConfigPatch", () => {
  test("accepts either field, both, or null to clear a value", () => {
    assert.deepEqual(validateConfigPatch({ pumpDurationSec: 30 }).value, { pumpDurationSec: 30 });
    assert.deepEqual(validateConfigPatch({ moistureThreshold: 0, pumpDurationSec: null }).value, {
      moistureThreshold: 0,
      pumpDurationSec: null,
    });
  });

  test("an empty body is rejected: there is nothing to change", () => {
    assert.deepEqual(validateConfigPatch({}).errors.map((e) => e.field), ["body"]);
  });

  for (const moistureThreshold of [-1, "400", Infinity, NaN, true]) {
    test(`rejects moistureThreshold ${String(moistureThreshold)}`, () => {
      assert.deepEqual(validateConfigPatch({ moistureThreshold }).errors.map((e) => e.field), [
        "moistureThreshold",
      ]);
    });
  }

  for (const pumpDurationSec of [0, -5, 1.5, "30", 2147483648]) {
    test(`rejects pumpDurationSec ${String(pumpDurationSec)}`, () => {
      assert.deepEqual(validateConfigPatch({ pumpDurationSec }).errors.map((e) => e.field), ["pumpDurationSec"]);
    });
  }

  test("rejects fields outside the configuration", () => {
    assert.deepEqual(
      validateConfigPatch({ pumpDurationSec: 30, updatedBy: "1" }).errors.map((e) => e.field),
      ["updatedBy"],
    );
  });
});
