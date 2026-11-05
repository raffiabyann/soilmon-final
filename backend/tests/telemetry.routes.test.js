import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { ApiError } from "../src/middleware/errors.js";
import { signAccessToken } from "../src/auth/tokens.js";
import { generateApiKey, hashApiKey } from "../src/auth/apiKeys.js";

// Requests go through the real Express app; only the store is replaced.
async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const RECORD = {
  id: "17",
  nodeCode: "node-01",
  receivedAt: "2026-10-20T05:12:30.000Z",
  measuredAt: null,
  rawRegisters: [1, 2, 3, 4, 5, 6, 7],
  batteryVoltage: 3.31,
};

const VALID = { nodeCode: "node-01", rawRegisters: [1, 2, 3, 4, 5, 6, 7], batteryVoltage: 3.31 };

const NODE = { code: "node-01", lastReceivedAt: "2026-10-20T05:12:30.000Z" };

// Authentication itself is tested in auth.routes.test.js. Here every request carries a valid
// credential, so these tests check the same behaviour as before authentication existed.
const SECRET = "test-secret-that-is-at-least-32-chars";
const ADMIN = { id: "3", role: "admin" };
const BEARER = `Bearer ${signAccessToken(ADMIN, SECRET)}`;
const API_KEY = generateApiKey();

const authStore = {
  async findActiveDevice(apiKeyHash) {
    return apiKeyHash === hashApiKey(API_KEY) ? { nodeId: "1", nodeCode: "node-01" } : null;
  },
};

function get(baseUrl, path) {
  return fetch(`${baseUrl}${path}`, { headers: { authorization: BEARER } });
}

function freshState() {
  return {
    calls: [],
    insertResult: RECORD,
    listResult: { access: "granted", records: [RECORD] },
    nodesResult: [NODE],
    nodeResult: { access: "granted", node: NODE },
    error: null,
  };
}

// The app keeps a reference to this object, so tests reset its state instead of replacing it.
function fakeStore() {
  return {
    ...freshState(),
    async insertRecord(input) {
      this.calls.push(["insertRecord", input]);
      if (this.error) throw this.error;
      return this.insertResult;
    },
    async listRecords(nodeCode, options, user) {
      this.calls.push(["listRecords", nodeCode, options, user]);
      if (this.error) throw this.error;
      return this.listResult;
    },
    async listNodes(user) {
      this.calls.push(["listNodes", user]);
      if (this.error) throw this.error;
      return this.nodesResult;
    },
    async getNode(nodeCode, user) {
      this.calls.push(["getNode", nodeCode, user]);
      if (this.error) throw this.error;
      return this.nodeResult;
    },
  };
}

function post(baseUrl, body, headers = {}) {
  return fetch(`${baseUrl}/api/v1/telemetry`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("telemetry routes", () => {
  let server;
  let baseUrl;
  let store;
  let originalConsoleError;

  before(async () => {
    originalConsoleError = console.error;
    console.error = () => {};
    store = fakeStore();
    ({ server, baseUrl } = await listen(createApp({ telemetryStore: store, authStore, jwtSecret: SECRET })));
  });

  beforeEach(() => {
    Object.assign(store, freshState());
  });

  after(async () => {
    console.error = originalConsoleError;
    await new Promise((resolve) => server.close(resolve));
  });

  test("POST stores a valid record and returns 201 with the record", async () => {
    const res = await post(baseUrl, { ...VALID, measuredAt: "2026-10-20T12:12:00+07:00" });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { data: RECORD });

    const [[name, input]] = store.calls;
    assert.equal(name, "insertRecord");
    assert.equal(input.measuredAt.toISOString(), "2026-10-20T05:12:00.000Z");
    assert.deepEqual(input.rawRegisters, VALID.rawRegisters);
  });

  test("POST rejects a contract violation with 422 and per-field details", async () => {
    const res = await post(baseUrl, { nodeCode: 7, rawRegisters: [1, 2, 3, 4, 5, 6, 70000], extra: 1 });
    assert.equal(res.status, 422);
    const { error } = await res.json();
    assert.equal(error.code, "validation_failed");
    assert.deepEqual(
      error.details.map((d) => d.field),
      ["extra", "nodeCode", "rawRegisters[6]"],
    );
    assert.equal(store.calls.length, 0);
  });

  test("POST without a JSON content type is a 422, not a crash", async () => {
    const res = await post(baseUrl, JSON.stringify(VALID), { "content-type": "text/plain" });
    assert.equal(res.status, 422);
    assert.deepEqual((await res.json()).error.details, [{ field: "body", message: "must be a JSON object" }]);
  });

  test("POST from an unregistered node is a 422 unknown_node", async () => {
    store.insertResult = null;
    const res = await post(baseUrl, VALID);
    assert.equal(res.status, 422);
    const { error } = await res.json();
    assert.equal(error.code, "unknown_node");
    assert.deepEqual(error.details, [{ field: "nodeCode", message: "is not a registered node" }]);
  });

  test("POST reports an unavailable database as 503", async () => {
    store.error = new ApiError(503, "database_unavailable", "The database is not available.");
    const res = await post(baseUrl, VALID);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, "database_unavailable");
  });

  test("POST hides unexpected database errors behind a generic 500", async () => {
    store.error = Object.assign(new Error('relation "telemetry_records" does not exist'), {
      code: "42P01",
    });
    const res = await post(baseUrl, VALID);
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), {
      error: { code: "internal_error", message: "Internal server error." },
    });
    assert.doesNotMatch(text, /relation|telemetry_records|42P01/);
  });

  test("GET returns the node's history with the default limit", async () => {
    const res = await get(baseUrl, "/api/v1/nodes/node-01/telemetry");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { data: [RECORD] });
    assert.deepEqual(store.calls, [["listRecords", "node-01", { limit: 50, from: null, to: null }, ADMIN]]);
  });

  test("GET passes limit and time range to the store", async () => {
    const res = await get(
      baseUrl,
      "/api/v1/nodes/node-01/telemetry?limit=500&from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z",
    );
    assert.equal(res.status, 200);
    const [, , options] = store.calls[0];
    assert.equal(options.limit, 500);
    assert.equal(options.from.toISOString(), "2026-10-01T00:00:00.000Z");
    assert.equal(options.to.toISOString(), "2026-10-02T00:00:00.000Z");
  });

  test("GET rejects a limit above the maximum with 422", async () => {
    const res = await get(baseUrl, "/api/v1/nodes/node-01/telemetry?limit=501");
    assert.equal(res.status, 422);
    const { error } = await res.json();
    assert.equal(error.code, "validation_failed");
    assert.deepEqual(error.details.map((d) => d.field), ["limit"]);
    assert.equal(store.calls.length, 0);
  });

  test("GET for an unregistered node is a 404", async () => {
    store.listResult = { access: "missing" };
    const res = await get(baseUrl, "/api/v1/nodes/ghost/telemetry");
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, "not_found");
  });

  test("GET with a node code that cannot exist is a 404 without a database call", async () => {
    const res = await get(baseUrl, "/api/v1/nodes/bad%20code/telemetry");
    assert.equal(res.status, 404);
    assert.equal(store.calls.length, 0);
  });

  test("GET /nodes lists the registered nodes", async () => {
    const res = await get(baseUrl, "/api/v1/nodes");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { data: [NODE] });
    assert.deepEqual(store.calls, [["listNodes", ADMIN]]);
  });

  test("GET /nodes/{node} returns one node", async () => {
    const res = await get(baseUrl, "/api/v1/nodes/node-01");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { data: NODE });
    assert.deepEqual(store.calls, [["getNode", "node-01", ADMIN]]);
  });

  test("GET /nodes/{node} for an unregistered node is a 404", async () => {
    store.nodeResult = { access: "missing" };
    const res = await get(baseUrl, "/api/v1/nodes/node-99");
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, "not_found");
  });

  test("GET /nodes/{node} with a code that cannot exist is a 404 without a database call", async () => {
    const res = await get(baseUrl, "/api/v1/nodes/bad%20code");
    assert.equal(res.status, 404);
    assert.equal(store.calls.length, 0);
  });

  test("GET on the ingestion path is a 404", async () => {
    const res = await fetch(`${baseUrl}/api/v1/telemetry`);
    assert.equal(res.status, 404);
  });

  test("/health is unchanged and does not touch the store", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.deepEqual(await res.json(), { data: { status: "ok" } });
    assert.equal(store.calls.length, 0);
  });
});

describe("telemetry routes without a database", () => {
  let server;
  let baseUrl;

  // JWT_SECRET is set, so a user token can be verified without the database; a device key cannot.
  before(async () => {
    ({ server, baseUrl } = await listen(createApp({ jwtSecret: SECRET })));
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  test("POST responds 503 when no store is configured", async () => {
    const res = await post(baseUrl, VALID);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), {
      error: { code: "database_unavailable", message: "The database is not available." },
    });
  });

  test("GET responds 503 when no store is configured", async () => {
    const res = await get(baseUrl, "/api/v1/nodes/node-01/telemetry");
    assert.equal(res.status, 503);
  });

  test("GET /nodes responds 503 when no store is configured", async () => {
    const res = await get(baseUrl, "/api/v1/nodes");
    assert.equal(res.status, 503);
  });

  // Authentication runs before validation, so an unauthenticated caller cannot probe the contract.
  test("authentication runs first: a POST without an API key is a 401, even without a database", async () => {
    const res = await post(baseUrl, {}, { "x-api-key": "" });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, "unauthenticated");
  });

  test("an invalid POST with an API key is a 503: the key cannot be checked without a database", async () => {
    const res = await post(baseUrl, {});
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, "database_unavailable");
  });
});
