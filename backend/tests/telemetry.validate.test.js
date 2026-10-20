import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  HISTORY_DEFAULT_LIMIT,
  HISTORY_MAX_LIMIT,
  parseTimestamp,
  validateHistoryQuery,
  validateTelemetryInput,
} from "../src/telemetry/validate.js";

const REGISTERS = [0, 1, 2, 3, 4, 5, 65535];

function valid(overrides = {}) {
  return { nodeCode: "node-01", rawRegisters: [...REGISTERS], ...overrides };
}

function fields(result) {
  return result.errors.map((e) => e.field);
}

describe("validateTelemetryInput", () => {
  test("accepts a minimal record and defaults optional fields to null", () => {
    const { value, errors } = validateTelemetryInput(valid());
    assert.deepEqual(errors, []);
    assert.deepEqual(value, {
      nodeCode: "node-01",
      rawRegisters: REGISTERS,
      batteryVoltage: null,
      measuredAt: null,
    });
  });

  test("accepts a full record and parses measuredAt into a Date", () => {
    const { value, errors } = validateTelemetryInput(
      valid({ batteryVoltage: 3.31, measuredAt: "2026-10-20T12:12:00+07:00" }),
    );
    assert.deepEqual(errors, []);
    assert.equal(value.batteryVoltage, 3.31);
    assert.equal(value.measuredAt.toISOString(), "2026-10-20T05:12:00.000Z");
  });

  test("accepts explicit nulls for optional fields", () => {
    const { errors } = validateTelemetryInput(valid({ batteryVoltage: null, measuredAt: null }));
    assert.deepEqual(errors, []);
  });

  test("keeps register order and does not convert values", () => {
    const raw = [65535, 0, 32768, 1, 2, 3, 4];
    assert.deepEqual(validateTelemetryInput(valid({ rawRegisters: raw })).value.rawRegisters, raw);
  });

  for (const body of [null, undefined, [], "text", 42]) {
    test(`rejects a body that is not an object: ${JSON.stringify(body) ?? "undefined"}`, () => {
      assert.deepEqual(fields(validateTelemetryInput(body)), ["body"]);
    });
  }

  test("reports every missing required field", () => {
    const result = validateTelemetryInput({});
    assert.deepEqual(fields(result), ["nodeCode", "rawRegisters"]);
    assert.equal(result.value, null);
  });

  test("rejects fields outside the contract", () => {
    const result = validateTelemetryInput(valid({ rssi: -80, temperature: 25 }));
    assert.deepEqual(fields(result), ["rssi", "temperature"]);
  });

  for (const nodeCode of [42, "", "a".repeat(65), "node 01", "node/01", "nöde", ["node-01"]]) {
    test(`rejects nodeCode ${JSON.stringify(nodeCode)}`, () => {
      assert.deepEqual(fields(validateTelemetryInput(valid({ nodeCode }))), ["nodeCode"]);
    });
  }

  for (const rawRegisters of ["1,2,3,4,5,6,7", { 0: 1 }, [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7, 8]]) {
    test(`rejects rawRegisters with the wrong shape: ${JSON.stringify(rawRegisters)}`, () => {
      assert.deepEqual(fields(validateTelemetryInput(valid({ rawRegisters }))), ["rawRegisters"]);
    });
  }

  for (const bad of [-1, 65536, 1.5, "7", null, NaN, Infinity, [1], true]) {
    test(`rejects register value ${String(bad)} and names its index`, () => {
      const rawRegisters = [...REGISTERS];
      rawRegisters[3] = bad;
      assert.deepEqual(fields(validateTelemetryInput(valid({ rawRegisters }))), ["rawRegisters[3]"]);
    });
  }

  for (const batteryVoltage of [-0.1, "3.3", Infinity, -Infinity, NaN, true]) {
    test(`rejects batteryVoltage ${String(batteryVoltage)}`, () => {
      assert.deepEqual(fields(validateTelemetryInput(valid({ batteryVoltage }))), ["batteryVoltage"]);
    });
  }

  test("rejects batteryVoltage that JSON parsing turned into Infinity", () => {
    const body = JSON.parse('{"nodeCode":"n1","rawRegisters":[1,2,3,4,5,6,7],"batteryVoltage":1e400}');
    assert.deepEqual(fields(validateTelemetryInput(body)), ["batteryVoltage"]);
  });

  for (const measuredAt of [
    "2026-10-20T05:12:00",
    "2026-10-20 05:12:00Z",
    "2026-10-20",
    "2026-02-30T00:00:00Z",
    "2026-13-01T00:00:00Z",
    "2026-10-20T24:00:00Z",
    1760937120000,
    "yesterday",
  ]) {
    test(`rejects measuredAt ${JSON.stringify(measuredAt)}`, () => {
      assert.deepEqual(fields(validateTelemetryInput(valid({ measuredAt }))), ["measuredAt"]);
    });
  }
});

describe("parseTimestamp", () => {
  test("accepts fractional seconds and offsets", () => {
    assert.equal(parseTimestamp("2024-02-29T23:59:59.123Z").toISOString(), "2024-02-29T23:59:59.123Z");
    assert.equal(parseTimestamp("2026-10-20T00:00:00-05:30").toISOString(), "2026-10-20T05:30:00.000Z");
  });
});

describe("validateHistoryQuery", () => {
  test("defaults to the default limit and no time range", () => {
    assert.deepEqual(validateHistoryQuery({}), {
      value: { limit: HISTORY_DEFAULT_LIMIT, from: null, to: null },
      errors: [],
    });
  });

  test("accepts limit bounds and a time range", () => {
    assert.equal(validateHistoryQuery({ limit: "1" }).value.limit, 1);
    assert.equal(validateHistoryQuery({ limit: String(HISTORY_MAX_LIMIT) }).value.limit, HISTORY_MAX_LIMIT);
    const { value } = validateHistoryQuery({ from: "2026-10-01T00:00:00Z", to: "2026-10-02T00:00:00Z" });
    assert.equal(value.from.toISOString(), "2026-10-01T00:00:00.000Z");
    assert.equal(value.to.toISOString(), "2026-10-02T00:00:00.000Z");
  });

  for (const limit of ["0", String(HISTORY_MAX_LIMIT + 1), "-1", "1e2", "0x10", " 5", "abc", ""]) {
    test(`rejects limit ${JSON.stringify(limit)}`, () => {
      assert.deepEqual(fields(validateHistoryQuery({ limit })), ["limit"]);
    });
  }

  test("rejects a repeated parameter", () => {
    assert.deepEqual(fields(validateHistoryQuery({ limit: ["5", "6"] })), ["limit"]);
  });

  test("rejects unsupported parameters", () => {
    assert.deepEqual(fields(validateHistoryQuery({ limt: "5", order: "asc" })), ["limt", "order"]);
  });

  test("rejects invalid timestamps and an empty or reversed range", () => {
    assert.deepEqual(fields(validateHistoryQuery({ from: "2026-10-01" })), ["from"]);
    const same = "2026-10-01T00:00:00Z";
    assert.deepEqual(fields(validateHistoryQuery({ from: same, to: same })), ["from"]);
    assert.deepEqual(
      fields(validateHistoryQuery({ from: "2026-10-02T00:00:00Z", to: "2026-10-01T00:00:00Z" })),
      ["from"],
    );
  });
});
