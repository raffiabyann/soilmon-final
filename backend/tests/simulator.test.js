import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_REGISTERS,
  DEFAULTS,
  buildPayload,
  nextBatteryVoltage,
  nextRegisters,
  parseArgs,
} from "../src/simulator/payload.js";
import { validateTelemetryInput } from "../src/telemetry/validate.js";

describe("simulator payload", () => {
  test("every generated payload passes the telemetry validator", () => {
    let registers = [...BASE_REGISTERS];
    let battery = 3.31;
    for (let i = 0; i < 500; i += 1) {
      registers = nextRegisters(registers);
      battery = nextBatteryVoltage(battery);
      const { errors } = validateTelemetryInput(buildPayload("node-01", registers, battery));
      assert.deepEqual(errors, []);
    }
  });

  test("registers stay inside uint16 at both ends", () => {
    // Lowest draw: 0 cannot go negative, 65535 drops by 2% (1311).
    assert.deepEqual(nextRegisters([0, 65535], () => 0), [0, 64224]);
    assert.deepEqual(nextRegisters([0, 65535], () => 1), [1, 65535]);
  });

  test("battery voltage stays between 2.8 V and 4.2 V with two decimals", () => {
    assert.equal(nextBatteryVoltage(2.8, () => 0), 2.8);
    assert.equal(nextBatteryVoltage(4.2, () => 1), 4.2);
    assert.equal(nextBatteryVoltage(3.31, () => 0.5), 3.31);
  });

  test("payloads carry no measuredAt, like the prototype gateway", () => {
    assert.deepEqual(Object.keys(buildPayload("node-01", BASE_REGISTERS, 3.31)), [
      "nodeCode",
      "rawRegisters",
      "batteryVoltage",
    ]);
  });
});

describe("simulator arguments", () => {
  test("defaults to node-01 on localhost every 10 seconds", () => {
    assert.deepEqual(parseArgs([]), { options: { ...DEFAULTS, nodes: ["node-01"] }, errors: [] });
  });

  test("accepts repeated and comma-separated nodes, interval, count and url", () => {
    const { options, errors } = parseArgs([
      "--node",
      "node-01,node-02",
      "--node",
      "node-03",
      "--interval",
      "5",
      "--count",
      "3",
      "--url",
      "http://127.0.0.1:3000/",
    ]);
    assert.deepEqual(errors, []);
    assert.deepEqual(options, {
      url: "http://127.0.0.1:3000",
      nodes: ["node-01", "node-02", "node-03"],
      intervalSeconds: 5,
      count: 3,
    });
  });

  test("reports bad values instead of guessing", () => {
    const { errors } = parseArgs([
      "--node",
      "bad code",
      "--interval",
      "0",
      "--count",
      "1.5",
      "--url",
      "ftp://x",
      "--verbose",
    ]);
    assert.deepEqual(errors, [
      '--node "bad code" is not a valid node code',
      "--interval must be a whole number of at least 1",
      "--count must be a whole number of at least 1",
      "--url must be an http(s) URL",
      "Unknown argument: --verbose",
    ]);
  });

  test("a flag without a value is an error", () => {
    assert.deepEqual(parseArgs(["--interval"]).errors, ["--interval needs a value"]);
  });
});
