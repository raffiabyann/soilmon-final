import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_BAUD,
  DEFAULT_URL,
  forwardPacket,
  parseBridgeArgs,
  parseSerialLine,
} from "../src/bridge/bridge.js";

const KEY = "smk_" + "a".repeat(43);
const apiKeys = new Map([["node-01", KEY]]);
const endpoint = "http://127.0.0.1:3000/api/v1/telemetry";
const GATEWAY_LINE = 'JSON:{"nodeCode":"node-01","rawRegisters":[512,268,1200,65,30,12,45]}';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("parseBridgeArgs", () => {
  test("needs --port and fills the defaults", () => {
    assert.deepEqual(parseBridgeArgs(["--port", "COM5"]), {
      options: { port: "COM5", baud: DEFAULT_BAUD, url: DEFAULT_URL, list: false },
      errors: [],
    });
    assert.equal(DEFAULT_BAUD, 115200);
    assert.match(parseBridgeArgs([]).errors[0], /--port is required/);
  });

  test("--list works without --port", () => {
    assert.deepEqual(parseBridgeArgs(["--list"]).errors, []);
  });

  test("reads --baud and --url, dropping a trailing slash", () => {
    const { options, errors } = parseBridgeArgs(["--port", "COM3", "--baud", "9600", "--url", "http://10.0.0.2:3000/"]);
    assert.deepEqual(errors, []);
    assert.equal(options.baud, 9600);
    assert.equal(options.url, "http://10.0.0.2:3000");
  });

  for (const argv of [
    ["--port"],
    ["--port", "--baud"],
    ["--port", "COM5", "--baud", "fast"],
    ["--port", "COM5", "--baud", "0"],
    ["--port", "COM5", "--url", "ftp://x"],
    ["--port", "COM5", "--url", "not a url"],
    ["--port", "COM5", "--verbose"],
  ]) {
    test(`rejects ${argv.join(" ")}`, () => {
      assert.ok(parseBridgeArgs(argv).errors.length > 0);
    });
  }
});

describe("parseSerialLine", () => {
  test("reads the gateway line and keeps the body unchanged", () => {
    assert.deepEqual(parseSerialLine(GATEWAY_LINE), {
      kind: "packet",
      nodeCode: "node-01",
      body: { nodeCode: "node-01", rawRegisters: [512, 268, 1200, 65, 30, 12, 45] },
    });
  });

  test("drops the carriage return of a CRLF line", () => {
    assert.equal(parseSerialLine(`${GATEWAY_LINE}\r`).kind, "packet");
  });

  test("keeps optional fields such as seq for the backend to check", () => {
    const parsed = parseSerialLine('JSON:{"nodeCode":"node-02","rawRegisters":[1,2,3,4,5,6,7],"seq":9}');
    assert.equal(parsed.body.seq, 9);
  });

  for (const line of ["", "ets Jun  8 2016 00:22:57", "ACK 1 12", "SM,1,12,1,2,3,4,5,6,7*ABCD", " JSON:{}", "json:{}"]) {
    test(`ignores ${JSON.stringify(line)}`, () => {
      assert.deepEqual(parseSerialLine(line), { kind: "ignore" });
    });
  }

  for (const [line, reason] of [
    ['JSON:{"nodeCode":"node-01",', /not valid JSON/],
    ["JSON:", /not valid JSON/],
    ["JSON:[1,2]", /not a JSON object/],
    ["JSON:null", /not a JSON object/],
    ['JSON:{"rawRegisters":[1]}', /nodeCode/],
    ['JSON:{"nodeCode":7}', /nodeCode/],
  ]) {
    test(`reports ${JSON.stringify(line)} as invalid`, () => {
      const parsed = parseSerialLine(line);
      assert.equal(parsed.kind, "invalid");
      assert.match(parsed.reason, reason);
    });
  }

  test("shortens a long broken line in the reason", () => {
    const parsed = parseSerialLine(`JSON:{${"x".repeat(500)}`);
    assert.ok(parsed.reason.length < 120);
  });
});

describe("forwardPacket", () => {
  const packet = parseSerialLine(GATEWAY_LINE);

  test("posts the body with the node's key", async () => {
    let seen;
    const fetchImpl = async (url, init) => {
      seen = { url, init };
      return jsonResponse(201, { data: { id: "42" } });
    };
    const text = await forwardPacket(packet, { endpoint, apiKeys, fetchImpl });
    assert.equal(text, "node-01 201 stored id=42");
    assert.equal(seen.url, endpoint);
    assert.equal(seen.init.method, "POST");
    assert.equal(seen.init.headers["x-api-key"], KEY);
    assert.deepEqual(JSON.parse(seen.init.body), packet.body);
  });

  test("reports a duplicate", async () => {
    const fetchImpl = async () => jsonResponse(200, { data: { id: "41" }, duplicate: true });
    assert.equal(await forwardPacket(packet, { endpoint, apiKeys, fetchImpl }), "node-01 200 duplicate of id=41");
  });

  test("reports the backend's error code and first detail", async () => {
    const fetchImpl = async () =>
      jsonResponse(422, {
        error: {
          code: "validation_failed",
          message: "x",
          details: [{ field: "rawRegisters", message: "must have exactly 7 items" }],
        },
      });
    assert.equal(
      await forwardPacket(packet, { endpoint, apiKeys, fetchImpl }),
      "node-01 422 validation_failed: rawRegisters must have exactly 7 items",
    );
  });

  test("a rejected key is reported without printing the key", async () => {
    const fetchImpl = async () => jsonResponse(401, { error: { code: "unauthenticated", message: "x" } });
    const text = await forwardPacket(packet, { endpoint, apiKeys, fetchImpl });
    assert.match(text, /^node-01 401 unauthenticated/);
    assert.ok(!text.includes(KEY));
  });

  test("a non-JSON answer is reported by status", async () => {
    const fetchImpl = async () => new Response("<html>bad gateway</html>", { status: 502 });
    assert.equal(await forwardPacket(packet, { endpoint, apiKeys, fetchImpl }), "node-01 502 no JSON error body");
  });

  test("a node without a key is skipped and nothing is sent", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
    };
    const other = parseSerialLine('JSON:{"nodeCode":"node-09","rawRegisters":[1,2,3,4,5,6,7]}');
    const text = await forwardPacket(other, { endpoint, apiKeys, fetchImpl });
    assert.match(text, /^node-09 skipped: no API key/);
    assert.equal(called, false);
  });

  test("a backend that is down does not throw", async () => {
    const fetchImpl = async () => {
      throw new TypeError("fetch failed");
    };
    const text = await forwardPacket(packet, { endpoint, apiKeys, fetchImpl });
    assert.equal(text, "node-01 backend unreachable (connection failed), packet dropped");
    assert.ok(!text.includes(KEY));
  });

  test("a backend that does not answer times out", async () => {
    const fetchImpl = (url, init) =>
      new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
    const text = await forwardPacket(packet, { endpoint, apiKeys, fetchImpl, timeoutMs: 20 });
    assert.equal(text, "node-01 backend unreachable (no answer within 0.02 s), packet dropped");
  });

  test("a closed port on a real socket is reported as unreachable", async () => {
    const text = await forwardPacket(packet, { endpoint: "http://127.0.0.1:9/api/v1/telemetry", apiKeys });
    assert.match(text, /backend unreachable/);
  });
});
