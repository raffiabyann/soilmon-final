// Authentication and authorisation through the real Express app and middleware. The stores are
// fakes that answer access the way the SQL does (admin: every node; viewer: its user_nodes), so
// these tests check that each route asks the store as the right user and maps the answer to the
// right status. That the SQL itself enforces ownership is tested in auth.integration.test.js.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/auth/passwords.js";
import { generateApiKey, hashApiKey } from "../src/auth/apiKeys.js";

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const SECRET = "test-secret-that-is-at-least-32-chars";
const PASSWORD = "correct-password";

const USERS = [
  { id: "1", email: "viewer-a@soilmon.local", role: "viewer", nodes: ["node-01"] },
  { id: "2", email: "viewer-b@soilmon.local", role: "viewer", nodes: ["node-02"] },
  { id: "3", email: "admin@soilmon.local", role: "admin", nodes: [] },
];
const NODES = ["node-01", "node-02"];
const KEYS = { "node-01": generateApiKey(), "node-02": generateApiKey() };

function access(nodeCode, user) {
  if (!NODES.includes(nodeCode)) return "missing";
  if (user.role === "admin") return "granted";
  return USERS.find((u) => u.id === user.id)?.nodes.includes(nodeCode) ? "granted" : "denied";
}

function record(nodeCode) {
  return {
    id: "17",
    nodeCode,
    receivedAt: "2026-10-20T05:12:30.000Z",
    measuredAt: null,
    rawRegisters: [1, 2, 3, 4, 5, 6, 7],
    batteryVoltage: 3.31,
  };
}

function config(nodeCode, values = {}) {
  return {
    nodeCode,
    moistureThreshold: null,
    pumpDurationSec: null,
    updatedBy: null,
    updatedAt: null,
    ...values,
  };
}

function fakeStores(passwordHash) {
  const calls = [];
  return {
    calls,
    authStore: {
      async findUserByEmail(email) {
        const user = USERS.find((u) => u.email === email);
        return user ? { id: user.id, email: user.email, role: user.role, passwordHash } : null;
      },
      async findActiveDevice(apiKeyHash) {
        const code = NODES.find((c) => hashApiKey(KEYS[c]) === apiKeyHash);
        return code ? { nodeId: String(NODES.indexOf(code) + 1), nodeCode: code } : null;
      },
    },
    telemetryStore: {
      async insertRecord(input) {
        calls.push(["insertRecord", input.nodeCode]);
        return record(input.nodeCode);
      },
      async listNodes(user) {
        calls.push(["listNodes", user]);
        return NODES.filter((code) => access(code, user) === "granted").map((code) => ({
          code,
          lastReceivedAt: null,
        }));
      },
      async getNode(nodeCode, user) {
        calls.push(["getNode", nodeCode, user]);
        const result = access(nodeCode, user);
        return result === "granted" ? { access: result, node: { code: nodeCode, lastReceivedAt: null } } : { access: result };
      },
      async listRecords(nodeCode, options, user) {
        calls.push(["listRecords", nodeCode, user]);
        const result = access(nodeCode, user);
        return result === "granted" ? { access: result, records: [record(nodeCode)] } : { access: result };
      },
    },
    nodeConfigStore: {
      async getConfig(nodeCode, user) {
        calls.push(["getConfig", nodeCode, user]);
        const result = access(nodeCode, user);
        return result === "granted" ? { access: result, config: config(nodeCode) } : { access: result };
      },
      async updateConfig(nodeCode, changes, user) {
        calls.push(["updateConfig", nodeCode, changes, user]);
        const result = access(nodeCode, user);
        if (result !== "granted") return { access: result };
        // The SQL writes only for admins.
        if (user.role !== "admin") return { access: "denied" };
        return {
          access: result,
          config: config(nodeCode, { ...changes, updatedBy: user.id, updatedAt: "2026-11-05T00:00:00.000Z" }),
        };
      },
    },
  };
}

const TELEMETRY = { nodeCode: "node-01", rawRegisters: [1, 2, 3, 4, 5, 6, 7], batteryVoltage: 3.31 };

describe("auth routes", () => {
  let server;
  let baseUrl;
  let stores;
  const tokens = {};

  function login(email, password = PASSWORD) {
    return fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  }

  function request(method, path, { token, apiKey, headers = {}, body } = {}) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(apiKey ? { "x-api-key": apiKey } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  before(async () => {
    stores = fakeStores(await hashPassword(PASSWORD, 4));
    ({ server, baseUrl } = await listen(createApp({ ...stores, jwtSecret: SECRET })));
    for (const [name, email] of [
      ["viewerA", "viewer-a@soilmon.local"],
      ["viewerB", "viewer-b@soilmon.local"],
      ["admin", "admin@soilmon.local"],
    ]) {
      tokens[name] = (await (await login(email)).json()).data.accessToken;
    }
  });

  beforeEach(() => {
    stores.calls.length = 0;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  describe("login", () => {
    test("correct email and password: 200 with a bearer token", async () => {
      const res = await login("viewer-a@soilmon.local");
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.tokenType, "Bearer");
      assert.equal(data.expiresIn, 3600);
      assert.deepEqual(data.user, { id: "1", email: "viewer-a@soilmon.local", role: "viewer" });
      const payload = JSON.parse(Buffer.from(data.accessToken.split(".")[1], "base64url"));
      assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
      assert.equal(payload.sub, "1");
      assert.equal(payload.role, "viewer");
    });

    test("the email is matched without regard to case", async () => {
      assert.equal((await login("Viewer-A@SoilMon.local")).status, 200);
    });

    test("wrong password: 401", async () => {
      const res = await login("viewer-a@soilmon.local", "wrong-password");
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, "invalid_credentials");
    });

    test("an unknown email gets exactly the same response as a wrong password", async () => {
      const unknown = await login("nobody@soilmon.local");
      const wrong = await login("viewer-a@soilmon.local", "wrong-password");
      assert.equal(unknown.status, 401);
      assert.deepEqual(await unknown.json(), await wrong.json());
    });

    test("a malformed body is a 422 that names the fields", async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "", role: "admin" }),
      });
      assert.equal(res.status, 422);
      assert.deepEqual(
        (await res.json()).error.details.map((d) => d.field),
        ["role", "email", "password"],
      );
    });
  });

  describe("user tokens", () => {
    test("no token: 401 with a WWW-Authenticate challenge", async () => {
      const res = await request("GET", "/api/v1/nodes");
      assert.equal(res.status, 401);
      assert.match(res.headers.get("www-authenticate"), /^Bearer/);
      assert.equal((await res.json()).error.code, "unauthenticated");
      assert.equal(stores.calls.length, 0);
    });

    test("a token with one character changed: 401", async () => {
      const parts = tokens.viewerA.split(".");
      const i = Math.floor(parts[2].length / 2);
      parts[2] = parts[2].slice(0, i) + (parts[2][i] === "A" ? "B" : "A") + parts[2].slice(i + 1);
      const res = await request("GET", "/api/v1/nodes", { token: parts.join(".") });
      assert.equal(res.status, 401);
      assert.match(res.headers.get("www-authenticate"), /invalid_token/);
      assert.equal(stores.calls.length, 0);
    });

    test("a viewer's token edited to say admin: 401", async () => {
      const [header, , signature] = tokens.viewerA.split(".");
      const payload = JSON.parse(Buffer.from(tokens.viewerA.split(".")[1], "base64url"));
      const forged = Buffer.from(JSON.stringify({ ...payload, role: "admin" })).toString("base64url");
      const res = await request("GET", "/api/v1/nodes", { token: `${header}.${forged}.${signature}` });
      assert.equal(res.status, 401);
    });

    test("an Authorization header with another scheme: 401", async () => {
      const res = await request("GET", "/api/v1/nodes", { headers: { authorization: `Basic ${tokens.admin}` } });
      assert.equal(res.status, 401);
    });
  });

  describe("ownership", () => {
    test("viewer A reads its own node's telemetry: 200", async () => {
      const res = await request("GET", "/api/v1/nodes/node-01/telemetry", { token: tokens.viewerA });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).data[0].nodeCode, "node-01");
      assert.deepEqual(stores.calls, [["listRecords", "node-01", { id: "1", role: "viewer" }]]);
    });

    test("viewer A reads viewer B's node telemetry: 403 with no data", async () => {
      const res = await request("GET", "/api/v1/nodes/node-02/telemetry", { token: tokens.viewerA });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.deepEqual(body, { error: { code: "forbidden", message: "You do not have access to this node." } });
    });

    test("viewer A reads viewer B's node: 403", async () => {
      const res = await request("GET", "/api/v1/nodes/node-02", { token: tokens.viewerA });
      assert.equal(res.status, 403);
    });

    test("viewer A's node list is asked for as viewer A", async () => {
      const res = await request("GET", "/api/v1/nodes", { token: tokens.viewerA });
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data.map((n) => n.code), ["node-01"]);
      assert.deepEqual(stores.calls, [["listNodes", { id: "1", role: "viewer" }]]);
    });

    test("admin reads anyone's node: 200", async () => {
      for (const code of NODES) {
        const telemetry = await request("GET", `/api/v1/nodes/${code}/telemetry`, { token: tokens.admin });
        const node = await request("GET", `/api/v1/nodes/${code}`, { token: tokens.admin });
        assert.equal(telemetry.status, 200);
        assert.equal(node.status, 200);
      }
      const list = await request("GET", "/api/v1/nodes", { token: tokens.admin });
      assert.deepEqual((await list.json()).data.map((n) => n.code), NODES);
    });

    test("a node that does not exist is a 404, not a 403", async () => {
      const res = await request("GET", "/api/v1/nodes/node-99/telemetry", { token: tokens.viewerA });
      assert.equal(res.status, 404);
    });
  });

  describe("node configuration", () => {
    test("viewer GETs its own node's config: 200", async () => {
      const res = await request("GET", "/api/v1/nodes/node-01/config", { token: tokens.viewerA });
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data, config("node-01"));
    });

    test("viewer GETs another viewer's node config: 403", async () => {
      const res = await request("GET", "/api/v1/nodes/node-02/config", { token: tokens.viewerA });
      assert.equal(res.status, 403);
    });

    test("viewer PATCHes its own node's config: 403, and the store is never called", async () => {
      const res = await request("PATCH", "/api/v1/nodes/node-01/config", {
        token: tokens.viewerA,
        body: { pumpDurationSec: 30 },
      });
      assert.equal(res.status, 403);
      assert.equal((await res.json()).error.code, "forbidden");
      assert.equal(stores.calls.length, 0);
    });

    test("the role check runs before validation: a viewer's invalid PATCH is still a 403", async () => {
      const res = await request("PATCH", "/api/v1/nodes/node-01/config", {
        token: tokens.viewerA,
        body: { pumpDurationSec: -1 },
      });
      assert.equal(res.status, 403);
    });

    test("admin PATCHes a config: 200 with the stored values", async () => {
      const res = await request("PATCH", "/api/v1/nodes/node-02/config", {
        token: tokens.admin,
        body: { moistureThreshold: 412.5, pumpDurationSec: 30 },
      });
      assert.equal(res.status, 200);
      const { data } = await res.json();
      assert.equal(data.moistureThreshold, 412.5);
      assert.equal(data.pumpDurationSec, 30);
      assert.equal(data.updatedBy, "3");
      assert.deepEqual(stores.calls, [
        ["updateConfig", "node-02", { moistureThreshold: 412.5, pumpDurationSec: 30 }, { id: "3", role: "admin" }],
      ]);
    });

    test("admin PATCH with invalid values: 422 without a store call", async () => {
      const res = await request("PATCH", "/api/v1/nodes/node-01/config", {
        token: tokens.admin,
        body: { pumpDurationSec: 1.5, colour: "red" },
      });
      assert.equal(res.status, 422);
      assert.deepEqual((await res.json()).error.details.map((d) => d.field), ["colour", "pumpDurationSec"]);
      assert.equal(stores.calls.length, 0);
    });

    test("admin PATCH of a node that does not exist: 404", async () => {
      const res = await request("PATCH", "/api/v1/nodes/node-99/config", {
        token: tokens.admin,
        body: { pumpDurationSec: 30 },
      });
      assert.equal(res.status, 404);
    });

    test("PATCH without a token: 401", async () => {
      const res = await request("PATCH", "/api/v1/nodes/node-01/config", { body: { pumpDurationSec: 30 } });
      assert.equal(res.status, 401);
    });
  });

  describe("device keys", () => {
    test("POST telemetry with the right API key: 201", async () => {
      const res = await request("POST", "/api/v1/telemetry", { apiKey: KEYS["node-01"], body: TELEMETRY });
      assert.equal(res.status, 201);
      assert.deepEqual(stores.calls, [["insertRecord", "node-01"]]);
    });

    test("POST telemetry with a wrong API key: 401", async () => {
      const res = await request("POST", "/api/v1/telemetry", { apiKey: generateApiKey(), body: TELEMETRY });
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, "unauthenticated");
      assert.equal(stores.calls.length, 0);
    });

    test("POST telemetry with a malformed API key: 401", async () => {
      const res = await request("POST", "/api/v1/telemetry", { apiKey: "not-a-key", body: TELEMETRY });
      assert.equal(res.status, 401);
    });

    test("POST telemetry with a user JWT: 401", async () => {
      const res = await request("POST", "/api/v1/telemetry", { token: tokens.admin, body: TELEMETRY });
      assert.equal(res.status, 401);
      assert.equal(stores.calls.length, 0);
    });

    test("POST telemetry with a user JWT placed in X-API-Key: 401", async () => {
      const res = await request("POST", "/api/v1/telemetry", { apiKey: tokens.admin, body: TELEMETRY });
      assert.equal(res.status, 401);
    });

    test("node-01's key sending node-02's data: 403, and nothing is stored", async () => {
      const res = await request("POST", "/api/v1/telemetry", {
        apiKey: KEYS["node-01"],
        body: { ...TELEMETRY, nodeCode: "node-02" },
      });
      assert.equal(res.status, 403);
      assert.equal((await res.json()).error.code, "node_mismatch");
      assert.equal(stores.calls.length, 0);
    });

    test("an API key on GET /nodes: 401", async () => {
      const res = await request("GET", "/api/v1/nodes", { apiKey: KEYS["node-01"] });
      assert.equal(res.status, 401);
      assert.equal(stores.calls.length, 0);
    });

    test("an API key sent as a bearer token on GET /nodes: 401", async () => {
      const res = await request("GET", "/api/v1/nodes", { token: KEYS["node-01"] });
      assert.equal(res.status, 401);
    });
  });

  test("/health stays public", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
  });
});

describe("auth routes without JWT_SECRET", () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await listen(createApp({ ...fakeStores("unused") })));
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  test("login responds 503", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@soilmon.local", password: PASSWORD }),
    });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error.code, "auth_unavailable");
  });

  test("a request with a token responds 503: it cannot be verified", async () => {
    const res = await fetch(`${baseUrl}/api/v1/nodes`, { headers: { authorization: "Bearer x.y.z" } });
    assert.equal(res.status, 503);
  });

  test("a request without a token is still a 401", async () => {
    assert.equal((await fetch(`${baseUrl}/api/v1/nodes`)).status, 401);
  });
});
