import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp } from "../src/app.js";
import { errorHandler } from "../src/middleware/errors.js";

// Each app listens on an ephemeral loopback port so requests go through real HTTP
// without a client-testing dependency.
async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe("app", () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await listen(createApp()));
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  test("GET /health returns 200 with status ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /^application\/json/);
    assert.deepEqual(await res.json(), { data: { status: "ok" } });
  });

  test("does not send the X-Powered-By header", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("unknown route returns a JSON 404", async () => {
    const res = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get("content-type"), /^application\/json/);
    assert.deepEqual(await res.json(), {
      error: { code: "not_found", message: "Route not found." },
    });
  });

  test("malformed JSON body returns a JSON 400", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, "invalid_json");
  });

  test("unsupported body charset returns a JSON 415", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=latin9" },
      body: "{}",
    });
    assert.equal(res.status, 415);
    assert.equal((await res.json()).error.code, "unsupported_media_type");
  });

  test("unsupported content encoding returns a JSON 415", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: "POST",
      headers: { "content-type": "application/json", "content-encoding": "x-unknown" },
      body: "{}",
    });
    assert.equal(res.status, 415);
    assert.equal((await res.json()).error.code, "unsupported_media_type");
  });

  test("body over the size limit returns a JSON 413", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(200 * 1024) }),
    });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error.code, "payload_too_large");
  });
});

describe("errorHandler", () => {
  let server;
  let baseUrl;
  let originalConsoleError;

  before(async () => {
    originalConsoleError = console.error;
    console.error = () => {};

    const app = express();
    app.get("/boom", () => {
      const err = new Error("secret detail: password=hunter2");
      err.stack = "stack trace that must not leak";
      throw err;
    });
    app.get("/late", (req, res) => {
      res.write("partial");
      throw new Error("failed after the response started");
    });
    app.use(errorHandler);
    ({ server, baseUrl } = await listen(app));
  });

  after(async () => {
    console.error = originalConsoleError;
    await new Promise((resolve) => server.close(resolve));
  });

  test("unexpected errors return a generic 500 without details", async () => {
    const res = await fetch(`${baseUrl}/boom`);
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), {
      error: { code: "internal_error", message: "Internal server error." },
    });
    assert.doesNotMatch(text, /secret|hunter2|stack/);
  });

  test("an error after the response started ends the connection instead of a second response", async () => {
    const res = await fetch(`${baseUrl}/late`);
    assert.equal(res.status, 200);
    await assert.rejects(res.text());
  });
});

describe("errorHandler classification", () => {
  function fakeRes({ headersSent = false } = {}) {
    return {
      headersSent,
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
  }

  function clientError(status, message, expose = true) {
    return Object.assign(new Error(message), { status, expose });
  }

  test("delegates to next() without writing when headers were already sent", () => {
    const res = fakeRes({ headersSent: true });
    const err = new Error("late");
    let forwarded;
    errorHandler(err, {}, res, (e) => {
      forwarded = e;
    });
    assert.equal(forwarded, err);
    assert.equal(res.statusCode, undefined);
    assert.equal(res.body, undefined);
  });

  for (const [status, code] of [
    [400, "bad_request"],
    [404, "not_found"],
    [413, "payload_too_large"],
    [415, "unsupported_media_type"],
    [409, "client_error"],
    [429, "client_error"],
  ]) {
    test(`${status} is reported as ${code} with its status kept`, () => {
      const res = fakeRes();
      errorHandler(clientError(status, "detail"), {}, res, () => {});
      assert.equal(res.statusCode, status);
      assert.deepEqual(res.body, { error: { code, message: "detail" } });
    });
  }

  test("a 4xx error not marked for exposure keeps its status but hides its message", () => {
    const res = fakeRes();
    errorHandler(clientError(403, "internal reason", false), {}, res, () => {});
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, "client_error");
    assert.doesNotMatch(res.body.error.message, /internal reason/);
  });
});
