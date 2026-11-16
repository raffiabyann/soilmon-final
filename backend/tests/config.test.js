import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, JWT_SECRET_MIN_LENGTH, loadConfig } from "../src/config/env.js";

describe("loadConfig", () => {
  test("applies defaults when variables are unset", () => {
    assert.deepEqual(loadConfig({}), {
      host: "127.0.0.1",
      port: 3000,
      nodeEnv: "development",
      databaseUrl: null,
      jwtSecret: null,
    });
  });

  test("reads valid values", () => {
    const config = loadConfig({
      PORT: "8080",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pw@localhost:5432/soilmon",
    });
    assert.equal(config.port, 8080);
    assert.equal(config.nodeEnv, "production");
    assert.equal(config.databaseUrl, "postgresql://user:pw@localhost:5432/soilmon");
  });

  test("HOST defaults to loopback, also when set to an empty string", () => {
    assert.equal(loadConfig({}).host, "127.0.0.1");
    assert.equal(loadConfig({ HOST: "" }).host, "127.0.0.1");
  });

  for (const host of ["0.0.0.0", "127.0.0.1", "192.168.1.20", "::", "::1", "localhost", "soilmon-api.local"]) {
    test(`accepts HOST=${host}`, () => {
      assert.equal(loadConfig({ HOST: host }).host, host);
    });
  }

  for (const host of [" ", " 0.0.0.0", "0.0.0.0 ", "http://0.0.0.0", "0.0.0.0:3000", "[::1]", "-bad.local", "a b"]) {
    test(`rejects HOST=${JSON.stringify(host)}`, () => {
      assert.throws(() => loadConfig({ HOST: host }), ConfigError);
    });
  }

  for (const port of ["1", "65535"]) {
    test(`accepts boundary PORT=${port}`, () => {
      assert.equal(loadConfig({ PORT: port }).port, Number(port));
    });
  }

  for (const port of ["0", "65536", "abc", "30.5"]) {
    test(`rejects PORT=${port}`, () => {
      assert.throws(() => loadConfig({ PORT: port }), ConfigError);
    });
  }

  // Formats that Number() would silently accept.
  for (const port of ["0x10", "1e3", "0b11", "0o17", "   ", " 3000", "3000 ", "+3000", "-1", "3_000"]) {
    test(`rejects non-decimal PORT=${JSON.stringify(port)}`, () => {
      assert.throws(() => loadConfig({ PORT: port }), ConfigError);
    });
  }

  test("rejects an unknown NODE_ENV", () => {
    assert.throws(() => loadConfig({ NODE_ENV: "staging" }), ConfigError);
  });

  test("rejects a DATABASE_URL that is not a URL, without echoing it", () => {
    assert.throws(
      () => loadConfig({ DATABASE_URL: "not a url secret" }),
      (err) => err instanceof ConfigError && !err.message.includes("secret"),
    );
  });

  test("rejects a DATABASE_URL with a non-PostgreSQL scheme", () => {
    assert.throws(() => loadConfig({ DATABASE_URL: "mysql://localhost/soilmon" }), ConfigError);
  });

  test("reads a JWT_SECRET of the minimum length", () => {
    const secret = "s".repeat(JWT_SECRET_MIN_LENGTH);
    assert.equal(loadConfig({ JWT_SECRET: secret }).jwtSecret, secret);
  });

  test("rejects a JWT_SECRET that is too short, without echoing it", () => {
    const secret = "short-secret-value";
    assert.throws(
      () => loadConfig({ JWT_SECRET: secret }),
      (err) => err instanceof ConfigError && !err.message.includes(secret),
    );
  });
});
