import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createTelemetryStore } from "../src/telemetry/store.js";
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

describe("telemetry store: insertRecord", () => {
  test("sends every value as a parameter and maps the row to camelCase", async () => {
    const db = fakeDb({ rows: [ROW] });
    const measuredAt = new Date("2026-10-20T05:12:00Z");
    const record = await createTelemetryStore(db).insertRecord({
      nodeCode: "node-01",
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: 3.31,
      measuredAt,
    });

    assert.equal(db.calls.length, 1);
    assert.deepEqual(db.calls[0].params, ["node-01", measuredAt, [1, 2, 3, 4, 5, 6, 7], 3.31]);
    assert.match(db.calls[0].text, /\$1::text/);
    assert.deepEqual(record, {
      id: "17",
      nodeCode: "node-01",
      receivedAt: "2026-10-20T05:12:30.000Z",
      measuredAt: null,
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: 3.31,
    });
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
    const record = await createTelemetryStore(db).insertRecord({
      nodeCode: "n1",
      rawRegisters: [1, 2, 3, 4, 5, 6, 7],
      batteryVoltage: null,
      measuredAt: new Date("2026-10-20T05:12:00Z"),
    });
    assert.equal(record.measuredAt, "2026-10-20T05:12:00.000Z");
  });
});

describe("telemetry store: listRecords", () => {
  test("looks up the node, then lists with parameters only", async () => {
    const db = fakeDb({ rows: [{ id: "4" }] }, { rows: [ROW] });
    const from = new Date("2026-10-01T00:00:00Z");
    const records = await createTelemetryStore(db).listRecords(HOSTILE, { limit: 50, from, to: null });

    assert.equal(db.calls.length, 2);
    assert.deepEqual(db.calls[0].params, [HOSTILE]);
    assert.deepEqual(db.calls[1].params, ["4", from, null, 50]);
    for (const { text } of db.calls) assert.doesNotMatch(text, /DROP|2026-10-01/);
    assert.match(db.calls[1].text, /ORDER BY received_at DESC, id DESC/);
    assert.equal(records.length, 1);
    assert.equal(records[0].nodeCode, HOSTILE);
  });

  test("returns null without listing when the node is not registered", async () => {
    const db = fakeDb({ rows: [] });
    assert.equal(await createTelemetryStore(db).listRecords("ghost", { limit: 5, from: null, to: null }), null);
    assert.equal(db.calls.length, 1);
  });

  test("returns an empty list for a registered node without records", async () => {
    const db = fakeDb({ rows: [{ id: "4" }] }, { rows: [] });
    assert.deepEqual(await createTelemetryStore(db).listRecords("n1", { limit: 5, from: null, to: null }), []);
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
        store.listRecords("n1", { limit: 5, from: null, to: null }),
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
      createTelemetryStore(fakeDb(err)).listRecords("n1", { limit: 5, from: null, to: null }),
      (e) => e === err,
    );
  });
});
