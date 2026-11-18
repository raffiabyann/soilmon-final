import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { REGISTER_SPECS, convertRegister, formatRegister } from "./registers.ts";

const TEMP = 1;

describe("REGISTER_SPECS", () => {
  test("covers R1 to R7 in order, only R2 is signed", () => {
    assert.deepEqual(
      REGISTER_SPECS.map((s) => s.raw),
      ["R1", "R2", "R3", "R4", "R5", "R6", "R7"],
    );
    assert.deepEqual(
      REGISTER_SPECS.filter((s) => s.signed).map((s) => s.raw),
      ["R2"],
    );
  });
});

describe("convertRegister", () => {
  test("applies each divisor to the gateway sample", () => {
    const sample = [512, 268, 1200, 65, 30, 12, 45];
    assert.deepEqual(
      sample.map((raw, i) => convertRegister(i, raw)),
      [51.2, 26.8, 1200, 6.5, 30, 12, 45],
    );
  });

  test("reads temperature as int16: 65436 is -10.0 °C", () => {
    assert.equal(convertRegister(TEMP, 65436), -10);
    assert.equal(formatRegister(TEMP, 65436), "-10.0");
  });

  test("temperature int16 boundaries", () => {
    assert.equal(convertRegister(TEMP, 0), 0);
    assert.equal(convertRegister(TEMP, 32767), 3276.7);
    assert.equal(convertRegister(TEMP, 32768), -3276.8);
    assert.equal(convertRegister(TEMP, 65535), -0.1);
  });

  test("unsigned registers never turn negative", () => {
    for (const i of [0, 2, 3, 4, 5, 6]) {
      assert.ok((convertRegister(i, 65535) ?? -1) > 0, REGISTER_SPECS[i]?.raw);
    }
    assert.equal(convertRegister(0, 65535), 6553.5);
    assert.equal(convertRegister(2, 65535), 65535);
  });

  test("returns null for a missing value, a non-uint16 value or an unknown register", () => {
    for (const raw of [undefined, -1, 65536, 1.5, Number.NaN]) {
      assert.equal(convertRegister(0, raw), null, String(raw));
    }
    assert.equal(convertRegister(7, 1), null);
    assert.equal(convertRegister(-1, 1), null);
  });
});

describe("formatRegister", () => {
  test("uses the fixed number of decimals per register", () => {
    const sample = [512, 268, 1200, 65, 30, 12, 45];
    assert.deepEqual(
      sample.map((raw, i) => formatRegister(i, raw)),
      ["51.2", "26.8", "1200", "6.5", "30", "12", "45"],
    );
    assert.equal(formatRegister(0, 500), "50.0");
  });

  test("never prints -0.0", () => {
    assert.equal(formatRegister(TEMP, 0), "0.0");
  });

  test("returns null when the value cannot be converted", () => {
    assert.equal(formatRegister(0, undefined), null);
    assert.equal(formatRegister(9, 1), null);
  });
});
