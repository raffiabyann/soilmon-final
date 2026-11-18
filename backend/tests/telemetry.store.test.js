import { describe, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { DUPLICATE_WINDOW_MINUTES, createTelemetryStore } from "../src/telemetry/store.js";
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

const ROW = {
  id: "17",
  received_at: new Date("2026-10-20T05:12:30.000Z"),
  measured_at: null,
  raw_registers: [1, 2, 3, 4, 5, 6, 7],
  battery_voltage: 3.31,
};

const HOSTILE = "x'; DROP TABLE nodes; --";

const VIEWER = { id: "7", role: "viewer" };
// Every query that returns node data must carry the ownership condition in its own SQL.
const OWNERSHIP = /'admin' OR EXISTS \(\s*SELECT 1 FROM user_nodes un/;

describe("telemetry store: insertRecord", () => {
  test("sends every value as a parameter and maps the row to camelCase", async () => {
    const db = fakeDb({ rows: [ROW] });
    const measuredAt = new Date("2026-10-20T05:12:00Z");
    const result = await createTelemetryStore(db).insertRecord({
      nodeCode: "node-01",
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: 3.31,
      measuredAt,
    });

    assert.equal(db.calls.length, 1);
    assert.deepEqual(db.calls[0].params, ["node-01", measuredAt, [1, 2, 3, 4, 5, 6, 7], 3.31, null]);
    assert.match(db.calls[0].text, /\$1::text/);
    assert.equal(result.duplicate, false);
    assert.deepEqual(result.record, {
      id: "17",
      nodeCode: "node-01",
      receivedAt: "2026-10-20T05:12:30.000Z",
      measuredAt: null,
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: 3.31,
      seq: null,
    });
  });

  test("writes the registers into r1..r7 and reads them back as one array", async () => {
    const db = fakeDb({ rows: [ROW] });
    await createTelemetryStore(db).insertRecord({
      nodeCode: "node-01",
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: null,
      measuredAt: null,
    });
    const { text } = db.calls[0];
    assert.match(text, /\(node_id, measured_at, r1, r2, r3, r4, r5, r6, r7, battery_voltage, seq\)/);
    assert.match(text, /\(\$3::integer\[\]\)\[7\]/);
    assert.match(text, /ARRAY\[r1, r2, r3, r4, r5, r6, r7\] AS raw_registers/);
    // Nothing is written to the old array column; it exists only as the read alias.
    assert.doesNotMatch(text.split("RETURNING")[0], /raw_registers/);
  });

  test("never places request values in the SQL text", async () => {
    const db = fakeDb({ rows: [] });
    await createTelemetryStore(db).insertRecord({
      nodeCode: HOSTILE,
      rawRegisters: [9, 9, 9, 9, 9, 9, 9],
      batteryVoltage: 1.23,
      measuredAt: null,
    });
    const { text, params } = db.calls[0];
    assert.equal(params[0], HOSTILE);
    assert.doesNotMatch(text, /DROP|1\.23|9,9/);
  });

  test("returns null when the node is not registered", async () => {
    const db = fakeDb({ rows: [] });
    const record = await createTelemetryStore(db).insertRecord({
      nodeCode: "ghost",
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: null,
      measuredAt: null,
    });
    assert.equal(record, null);
  });

  test("converts measured_at to an ISO string", async () => {
    const db = fakeDb({ rows: [{ ...ROW, measured_at: new Date("2026-10-20T05:12:00Z") }] });
    const { record } = await createTelemetryStore(db).insertRecord({
      nodeCode: "n1",
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: null,
      measuredAt: new Date("2026-10-20T05:12:00Z"),
    });
    assert.equal(record.measuredAt, "2026-10-20T05:12:00.000Z");
  });
});

const WITH_SEQ = {
  nodeCode: "node-01",
  rawRegisters: [1, 2, 3, 4, 5, 6, 7],
  batteryVoltage: null,
  measuredAt: null,
  seq: 42,
};

describe("telemetry store: insertRecord with seq", () => {
  test("looks up the node, locks it, finds no duplicate, then inserts", async () => {
    const db = fakeDb({ rows: [{ id: "9" }] }, { rows: [{}] }, { rows: [] }, { rows: [{ ...ROW, seq: 42 }] });
    const result = await createTelemetryStore(db).insertRecord(WITH_SEQ);

    assert.deepEqual(result, { record: { ...result.record, seq: 42 }, duplicate: false });
    const [node, lock, dup, insert] = db.calls;
    assert.deepEqual(node.params, ["node-01"]);
    assert.match(lock.text, /pg_advisory_xact_lock\(\d+, /);
    assert.deepEqual(lock.params, ["9"]);
    assert.deepEqual(dup.params, ["9", 42, [1, 2, 3, 4, 5, 6, 7]]);
    assert.match(dup.text, /ARRAY\[r1, r2, r3, r4, r5, r6, r7\] = \$3::integer\[\]/);
    assert.ok(dup.text.includes(`now() - interval '${DUPLICATE_WINDOW_MINUTES} minutes'`), dup.text);
    assert.equal(DUPLICATE_WINDOW_MINUTES, 2);
    assert.deepEqual(insert.params, ["node-01", null, [1, 2, 3, 4, 5, 6, 7], null, 42]);
  });

  test("returns the earlier record as a duplicate and does not insert", async () => {
    const earlier = { ...ROW, id: "5", seq: 42 };
    const db = fakeDb({ rows: [{ id: "9" }] }, { rows: [{}] }, { rows: [earlier] });
    const result = await createTelemetryStore(db).insertRecord(WITH_SEQ);
    assert.equal(result.duplicate, true);
    assert.equal(result.record.id, "5");
    assert.equal(db.calls.length, 3);
    assert.ok(!db.calls.some((c) => /INSERT/.test(c.text)));
  });

  test("an unknown node returns null without locking", async () => {
    const db = fakeDb({ rows: [] });
    assert.equal(await createTelemetryStore(db).insertRecord(WITH_SEQ), null);
    assert.equal(db.calls.length, 1);
  });

  test("given a Pool, it uses one checked-out connection in a transaction and releases it", async () => {
    const conn = fakeDb({ rows: [] }, { rows: [{ id: "9" }] }, { rows: [{}] }, { rows: [] }, { rows: [ROW] }, { rows: [] });
    let released = 0;
    conn.release = () => (released += 1);
    const pool = Object.create(pg.Pool.prototype);
    pool.connect = async () => conn;
    pool.query = () => assert.fail("the pool itself must not be queried");

    const result = await createTelemetryStore(pool).insertRecord(WITH_SEQ);
    assert.equal(result.duplicate, false);
    const texts = conn.calls.map((c) => c.text.trim().split(/\s+/)[0]);
    assert.deepEqual(texts, ["BEGIN", "SELECT", "SELECT", "SELECT", "INSERT", "COMMIT"]);
    assert.equal(released, 1);
  });

  test("given a Pool, a failure rolls back and still releases the connection", async () => {
    const conn = fakeDb({ rows: [] }, { rows: [{ id: "9" }] }, new Error("lock failed"), { rows: [] });
    let released = 0;
    conn.release = () => (released += 1);
    const pool = Object.create(pg.Pool.prototype);
    pool.connect = async () => conn;

    await assert.rejects(createTelemetryStore(pool).insertRecord(WITH_SEQ), /lock failed/);
    assert.equal(conn.calls.at(-1).text, "ROLLBACK");
    assert.equal(released, 1);
  });

  test("given a Pool that cannot connect, it reports 503", async () => {
    const pool = Object.create(pg.Pool.prototype);
    pool.connect = async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    };
    await assert.rejects(
      createTelemetryStore(pool).insertRecord(WITH_SEQ),
      (err) => err instanceof ApiError && err.status === 503,
    );
  });
});

describe("telemetry store: listRecords", () => {
  test("looks up the node, then lists with parameters only", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [ROW] });
    const from = new Date("2026-10-01T00:00:00Z");
    const { access, records } = await createTelemetryStore(db).listRecords(
      HOSTILE,
      { limit: 50, from, to: null },
      VIEWER,
    );

    assert.equal(db.calls.length, 2);
    assert.deepEqual(db.calls[0].params, [HOSTILE, "viewer", "7"]);
    assert.deepEqual(db.calls[1].params, ["4", from, null, 50, "viewer", "7"]);
    for (const { text } of db.calls) assert.doesNotMatch(text, /DROP|2026-10-01/);
    assert.match(db.calls[1].text, /ORDER BY received_at DESC, id DESC/);
    assert.match(db.calls[1].text, OWNERSHIP);
    assert.equal(access, "granted");
    assert.equal(records.length, 1);
    assert.equal(records[0].nodeCode, HOSTILE);
  });

  test("returns missing without listing when the node is not registered", async () => {
    const db = fakeDb({ rows: [] });
    assert.deepEqual(
      await createTelemetryStore(db).listRecords("ghost", { limit: 5, from: null, to: null }, VIEWER),
      { access: "missing" },
    );
    assert.equal(db.calls.length, 1);
  });

  test("returns denied without listing when the node is not the caller's", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: false }] });
    assert.deepEqual(
      await createTelemetryStore(db).listRecords("n1", { limit: 5, from: null, to: null }, VIEWER),
      { access: "denied" },
    );
    assert.equal(db.calls.length, 1);
  });

  test("returns an empty list for a registered node without records", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [] });
    assert.deepEqual(
      await createTelemetryStore(db).listRecords("n1", { limit: 5, from: null, to: null }, VIEWER),
      { access: "granted", records: [] },
    );
  });
});

describe("telemetry store: nodes", () => {
  test("lists nodes ordered by code, with the last received time", async () => {
    const db = fakeDb({
      rows: [
        { code: "node-01", last_received_at: new Date("2026-10-20T05:12:30.000Z") },
        { code: "node-02", last_received_at: null },
      ],
    });
    const nodes = await createTelemetryStore(db).listNodes(VIEWER);

    assert.deepEqual(db.calls[0].params, ["viewer", "7"]);
    assert.match(db.calls[0].text, /ORDER BY n\.code/);
    assert.match(db.calls[0].text, OWNERSHIP);
    assert.deepEqual(nodes, [
      { code: "node-01", lastReceivedAt: "2026-10-20T05:12:30.000Z" },
      { code: "node-02", lastReceivedAt: null },
    ]);
  });

  test("gets one node with the code as a parameter only", async () => {
    const db = fakeDb(
      { rows: [{ id: "4", allowed: true }] },
      { rows: [{ code: HOSTILE, last_received_at: null }] },
    );
    const { node } = await createTelemetryStore(db).getNode(HOSTILE, VIEWER);

    assert.deepEqual(db.calls[0].params, [HOSTILE, "viewer", "7"]);
    assert.deepEqual(db.calls[1].params, ["4", "viewer", "7"]);
    for (const { text } of db.calls) assert.doesNotMatch(text, /DROP/);
    assert.match(db.calls[1].text, OWNERSHIP);
    assert.deepEqual(node, { code: HOSTILE, lastReceivedAt: null });
  });

  test("returns missing when the node is not registered", async () => {
    assert.deepEqual(await createTelemetryStore(fakeDb({ rows: [] })).getNode("ghost", VIEWER), {
      access: "missing",
    });
  });

  test("returns denied without reading the node when it is not the caller's", async () => {
    const db = fakeDb({ rows: [{ id: "4", allowed: false }] });
    assert.deepEqual(await createTelemetryStore(db).getNode("n1", VIEWER), { access: "denied" });
    assert.equal(db.calls.length, 1);
  });

  test("returns denied when the data query finds no row the caller may read", async () => {
    // The assignment disappeared between the two queries; the second query enforces it again.
    const db = fakeDb({ rows: [{ id: "4", allowed: true }] }, { rows: [] });
    assert.deepEqual(await createTelemetryStore(db).getNode("n1", VIEWER), { access: "denied" });
  });
});

describe("telemetry store: database errors", () => {
  const unavailable = [
    Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }),
    Object.assign(new Error("terminating connection due to administrator command"), { code: "57P01" }),
    Object.assign(new Error("password authentication failed"), { code: "28P01" }),
    Object.assign(new Error("database does not exist"), { code: "3D000" }),
    new Error("timeout exceeded when trying to connect"),
    new Error("Connection terminated unexpectedly"),
  ];

  for (const err of unavailable) {
    test(`maps "${err.code ?? err.message}" to a 503 without database details`, async () => {
      const store = createTelemetryStore(fakeDb(err));
      await assert.rejects(
        store.listRecords("n1", { limit: 5, from: null, to: null }, VIEWER),
        (e) =>
          e instanceof ApiError &&
          e.status === 503 &&
          e.code === "database_unavailable" &&
          !e.message.includes(err.message),
      );
    });
  }

  test("passes other database errors through unchanged", async () => {
    const err = Object.assign(new Error('relation "nodes" does not exist'), { code: "42P01" });
    await assert.rejects(
      createTelemetryStore(fakeDb(err)).listRecords("n1", { limit: 5, from: null, to: null }, VIEWER),
      (e) => e === err,
    );
  });
});
