// Runs only when TEST_DATABASE_URL points at a dedicated, migrated PostgreSQL test database.
// Every test runs inside a transaction that is rolled back, so no data is kept.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { createTelemetryStore } from "../src/telemetry/store.js";

const url = process.env.TEST_DATABASE_URL;
// Skipping each test (not the suite) makes the test runner count them as skipped.
const skip = url ? false : "TEST_DATABASE_URL is not set";

// Identifies the database a URL points at, without its credentials.
function target(value) {
  try {
    const parsed = new URL(value);
    return {
      host: parsed.hostname.toLowerCase(),
      port: parsed.port || "5432",
      database: decodeURIComponent(parsed.pathname.slice(1)),
    };
  } catch {
    return null;
  }
}

// npm test does not load .env, so the application's DATABASE_URL is also read from the file.
function applicationDatabaseUrls() {
  const urls = [process.env.DATABASE_URL];
  const envFile = new URL("../.env", import.meta.url);
  if (existsSync(envFile)) urls.push(parseEnv(readFileSync(envFile, "utf8")).DATABASE_URL);
  return urls.filter(Boolean);
}

// Returns why the tests must not run against TEST_DATABASE_URL, or null when the target is safe.
// Messages name the database only, never the user, password or URL.
function refusalReason() {
  const testDb = target(url);
  if (!testDb) return "TEST_DATABASE_URL is not a valid URL.";
  if (!testDb.database.endsWith("_test")) {
    return `TEST_DATABASE_URL targets database "${testDb.database}"; its name must end with "_test".`;
  }
  for (const appUrl of applicationDatabaseUrls()) {
    const app = target(appUrl);
    if (
      app &&
      app.host === testDb.host &&
      app.port === testDb.port &&
      app.database === testDb.database
    ) {
      return `TEST_DATABASE_URL targets the same database as DATABASE_URL ("${testDb.database}").`;
    }
  }
  return null;
}

describe("telemetry store against PostgreSQL", () => {
  let client;

  before(async () => {
    if (skip) return;
    // Checked before any connection is opened.
    const reason = refusalReason();
    if (reason) throw new Error(`Refusing to run integration tests: ${reason}`);
    client = await getPool(loadConfig({ DATABASE_URL: url })).connect();
  });

  after(async () => {
    client?.release();
    await closePool();
  });

  async function inRollback(fn) {
    await client.query("BEGIN");
    try {
      await fn(createTelemetryStore(client));
    } finally {
      await client.query("ROLLBACK");
    }
  }

  test("inserts for a registered node and lists newest first", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ($1)", ["itest-node"]);
      const first = await store.insertRecord({
        nodeCode: "itest-node",
        rawRegisters: [0, 1, 2, 3, 4, 5, 65535],
        batteryVoltage: 3.31,
        measuredAt: new Date("2026-10-20T05:12:00Z"),
      });
      const second = await store.insertRecord({
        nodeCode: "itest-node",
        rawRegisters: [7, 7, 7, 7, 7, 7, 7],
        batteryVoltage: null,
        measuredAt: null,
      });

      assert.deepEqual(first.rawRegisters, [0, 1, 2, 3, 4, 5, 65535]);
      assert.equal(first.measuredAt, "2026-10-20T05:12:00.000Z");
      assert.equal(second.batteryVoltage, null);

      const records = await store.listRecords("itest-node", { limit: 10, from: null, to: null });
      assert.deepEqual(
        records.map((r) => r.id),
        [second.id, first.id],
      );
    }));

  test("lists nodes with the time of their newest record", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ($1), ($2)", ["itest-a", "itest-b"]);
      const record = await store.insertRecord({
        nodeCode: "itest-a",
        rawRegisters: [1, 2, 3, 4, 5, 6, 7],
        batteryVoltage: null,
        measuredAt: null,
      });

      const nodes = (await store.listNodes()).filter((n) => n.code.startsWith("itest-"));
      assert.deepEqual(nodes, [
        { code: "itest-a", lastReceivedAt: record.receivedAt },
        { code: "itest-b", lastReceivedAt: null },
      ]);
      assert.deepEqual(await store.getNode("itest-b"), { code: "itest-b", lastReceivedAt: null });
      assert.equal(await store.getNode("itest-missing"), null);
    }));

  test("returns null for an unregistered node and stores nothing", { skip }, () =>
    inRollback(async (store) => {
      const countBefore = await client.query("SELECT count(*)::int AS n FROM telemetry_records");
      const record = await store.insertRecord({
        nodeCode: "itest-missing",
        rawRegisters: [1, 2, 3, 4, 5, 6, 7],
        batteryVoltage: null,
        measuredAt: null,
      });
      const countAfter = await client.query("SELECT count(*)::int AS n FROM telemetry_records");
      assert.equal(record, null);
      assert.equal(countAfter.rows[0].n, countBefore.rows[0].n);
    }));

  test("the database rejects raw registers outside the uint16 range", { skip }, () =>
    inRollback(async () => {
      await client.query("INSERT INTO nodes (code) VALUES ($1)", ["itest-node"]);
      await client.query("SAVEPOINT bad_insert");
      await assert.rejects(
        client.query(
          `INSERT INTO telemetry_records (node_id, raw_registers)
           SELECT id, $2::integer[] FROM nodes WHERE code = $1`,
          ["itest-node", [1, 2, 3, 4, 5, 6, 70000]],
        ),
        (err) => err.code === "23514",
      );
      await client.query("ROLLBACK TO SAVEPOINT bad_insert");
    }));
});
