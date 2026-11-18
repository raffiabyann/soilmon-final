// Runs only when TEST_DATABASE_URL points at a dedicated, migrated PostgreSQL test database.
// Every test runs inside a transaction that is rolled back, so no data is kept.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { createTelemetryStore } from "../src/telemetry/store.js";
import { refusalReason } from "./helpers/testDatabase.js";

const url = process.env.TEST_DATABASE_URL;
// Skipping each test (not the suite) makes the test runner count them as skipped.
const skip = url ? false : "TEST_DATABASE_URL is not set";
// Ownership is tested in auth.integration.test.js; an admin reads every node.
const ADMIN = { id: "0", role: "admin" };

describe("telemetry store against PostgreSQL", () => {
  let client;

  before(async () => {
    if (skip) return;
    // Checked before any connection is opened.
    const reason = refusalReason(url);
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
      const { record: first } = await store.insertRecord({
        nodeCode: "itest-node",
        rawRegisters: [0, 1, 2, 3, 4, 5, 65535],
        batteryVoltage: 3.31,
        measuredAt: new Date("2026-10-20T05:12:00Z"),
      });
      const { record: second } = await store.insertRecord({
        nodeCode: "itest-node",
        rawRegisters: [7, 7, 7, 7, 7, 7, 7],
        batteryVoltage: null,
        measuredAt: null,
      });

      assert.deepEqual(first.rawRegisters, [0, 1, 2, 3, 4, 5, 65535]);
      assert.equal(first.measuredAt, "2026-10-20T05:12:00.000Z");
      assert.equal(second.batteryVoltage, null);

      const { records } = await store.listRecords("itest-node", { limit: 10, from: null, to: null }, ADMIN);
      assert.deepEqual(
        records.map((r) => r.id),
        [second.id, first.id],
      );
    }));

  test("lists nodes with the time of their newest record", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ($1), ($2)", ["itest-a", "itest-b"]);
      const { record } = await store.insertRecord({
        nodeCode: "itest-a",
        rawRegisters: [1, 2, 3, 4, 5, 6, 7],
        batteryVoltage: null,
        measuredAt: null,
      });

      const nodes = (await store.listNodes(ADMIN)).filter((n) => n.code.startsWith("itest-"));
      assert.deepEqual(nodes, [
        { code: "itest-a", lastReceivedAt: record.receivedAt },
        { code: "itest-b", lastReceivedAt: null },
      ]);
      assert.deepEqual((await store.getNode("itest-b", ADMIN)).node, { code: "itest-b", lastReceivedAt: null });
      assert.deepEqual(await store.getNode("itest-missing", ADMIN), { access: "missing" });
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
          `INSERT INTO telemetry_records (node_id, r1, r2, r3, r4, r5, r6, r7)
           SELECT id, 1, 2, 3, 4, 5, 6, $2::integer FROM nodes WHERE code = $1`,
          ["itest-node", 70000],
        ),
        (err) => err.code === "23514",
      );
      await client.query("ROLLBACK TO SAVEPOINT bad_insert");
    }));

  // Each test's transaction fixes now(), so "2 minutes ago" is moved by editing received_at.
  async function insertSeq(store, nodeCode, seq, rawRegisters = [1, 2, 3, 4, 5, 6, 7]) {
    return store.insertRecord({
      nodeCode,
      rawRegisters,
      batteryVoltage: null,
      measuredAt: null,
      seq,
    });
  }

  async function countFor(nodeCode) {
    const { rows } = await client.query(
      "SELECT count(*)::int AS n FROM telemetry_records t JOIN nodes n ON n.id = t.node_id WHERE n.code = $1",
      [nodeCode],
    );
    return rows[0].n;
  }

  test("the same node, seq and registers within 2 minutes is stored once and reported as a duplicate", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ('itest-seq')");
      const first = await insertSeq(store, "itest-seq", 300);
      const again = await insertSeq(store, "itest-seq", 300);
      assert.equal(first.duplicate, false);
      assert.equal(first.record.seq, 300);
      assert.equal(again.duplicate, true);
      assert.equal(again.record.id, first.record.id);
      assert.equal(await countFor("itest-seq"), 1);
    }));

  test("the same seq with other registers is a new packet, as after a node reboot", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ('itest-seq')");
      const first = await insertSeq(store, "itest-seq", 1, [1, 2, 3, 4, 5, 6, 7]);
      const after = await insertSeq(store, "itest-seq", 1, [1, 2, 3, 4, 5, 6, 8]);
      assert.equal(after.duplicate, false);
      assert.notEqual(after.record.id, first.record.id);
      assert.deepEqual(after.record.rawRegisters, [1, 2, 3, 4, 5, 6, 8]);
      assert.equal(await countFor("itest-seq"), 2);
    }));

  test("the same seq and registers are stored again once the earlier record is older than 2 minutes", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ('itest-seq')");
      const first = await insertSeq(store, "itest-seq", 0);
      await client.query("UPDATE telemetry_records SET received_at = now() - interval '3 minutes' WHERE id = $1", [
        first.record.id,
      ]);
      const after = await insertSeq(store, "itest-seq", 0);
      assert.equal(after.duplicate, false);
      assert.notEqual(after.record.id, first.record.id);
      assert.equal(await countFor("itest-seq"), 2);
    }));

  test("the same seq from another node, or no seq at all, is never a duplicate", { skip }, () =>
    inRollback(async (store) => {
      await client.query("INSERT INTO nodes (code) VALUES ('itest-seq-a'), ('itest-seq-b')");
      assert.equal((await insertSeq(store, "itest-seq-a", 9)).duplicate, false);
      assert.equal((await insertSeq(store, "itest-seq-b", 9)).duplicate, false);
      assert.equal((await insertSeq(store, "itest-seq-a", null)).duplicate, false);
      assert.equal((await insertSeq(store, "itest-seq-a", null)).duplicate, false);
      assert.equal(await countFor("itest-seq-a"), 3);
      assert.equal(await countFor("itest-seq-b"), 1);
    }));

  test("the database rejects seq outside 0..65535", { skip }, () =>
    inRollback(async () => {
      await client.query("INSERT INTO nodes (code) VALUES ('itest-seq')");
      for (const seq of [-1, 65536]) {
        await client.query("SAVEPOINT bad_seq");
        await assert.rejects(
          client.query(
            `INSERT INTO telemetry_records (node_id, r1, r2, r3, r4, r5, r6, r7, seq)
             SELECT id, 1, 2, 3, 4, 5, 6, 7, $2::integer FROM nodes WHERE code = $1`,
            ["itest-seq", seq],
          ),
          (err) => err.code === "23514",
        );
        await client.query("ROLLBACK TO SAVEPOINT bad_seq");
      }
    }));
});
