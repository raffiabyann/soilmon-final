import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_REGISTERS,
  DEFAULTS,
  buildPayload,
  nextBatteryVoltage,
  nextRegisters,
  nextSeq,
  parseApiKeys,
  parseArgs,
} from "../src/simulator/payload.js";
import { generateApiKey } from "../src/auth/apiKeys.js";
import { validateTelemetryInput } from "../src/telemetry/validate.js";

describe("simulator payload", () => {
  test("every generated payload passes the telemetry validator", () => {
    let registers = [...BASE_REGISTERS];
    let battery = 3.31;
    for (let i = 0; i < 500; i += 1) {
      registers = nextRegisters(registers);
      battery = nextBatteryVoltage(battery);
      const payload = buildPayload("node-01", registers, { batteryVoltage: battery, seq: i });
      const { errors } = validateTelemetryInput(payload);
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

  test("payloads carry no measuredAt, like the gateway", () => {
    assert.deepEqual(Object.keys(buildPayload("node-01", BASE_REGISTERS, { batteryVoltage: 3.31 })), [
      "nodeCode",
      "rawRegisters",
      "batteryVoltage",
    ]);
  });

  test("without battery or seq the payload is exactly the gateway's JSON, and it validates", () => {
    const payload = buildPayload("node-01", [...BASE_REGISTERS]);
    assert.deepEqual(payload, { nodeCode: "node-01", rawRegisters: [...BASE_REGISTERS] });
    assert.deepEqual(validateTelemetryInput(payload).errors, []);
  });

  test("seq is included when given, including 0", () => {
    assert.deepEqual(buildPayload("node-01", BASE_REGISTERS, { seq: 0 }), {
      nodeCode: "node-01",
      rawRegisters: BASE_REGISTERS,
      seq: 0,
    });
  });

  test("seq counts up and wraps after 65535 like the node's 16-bit counter", () => {
    assert.equal(nextSeq(0), 1);
    assert.equal(nextSeq(65534), 65535);
    assert.equal(nextSeq(65535), 0);
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
      battery: true,
      seq: false,
    });
  });

  test("--no-battery and --seq", () => {
    const { options, errors } = parseArgs(["--no-battery", "--seq"]);
    assert.deepEqual(errors, []);
    assert.equal(options.battery, false);
    assert.equal(options.seq, true);
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

describe("simulator API keys", () => {
  test("reads one key per node from SIMULATOR_API_KEYS", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    const { keys, errors } = parseApiKeys(` node-01:${a} , node-02:${b} `);
    assert.deepEqual(errors, []);
    assert.deepEqual([...keys], [["node-01", a], ["node-02", b]]);
  });

  test("an unset variable gives no keys and no errors", () => {
    assert.deepEqual(parseApiKeys(undefined), { keys: new Map(), errors: [] });
  });

  test("reports bad entries without printing the key", () => {
    const { errors } = parseApiKeys("node-01:not-a-real-key,bad code:x,node-03");
    assert.deepEqual(errors, [
      "SIMULATOR_API_KEYS: the key for node-01 is not a valid API key",
      'SIMULATOR_API_KEYS: "bad code" is not a valid node code',
      "SIMULATOR_API_KEYS: the key for node-03 is not a valid API key",
    ]);
    assert.equal(errors.some((e) => e.includes("not-a-real-key")), false);
  });
});
