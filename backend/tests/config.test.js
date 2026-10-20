import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, loadConfig } from "../src/config/env.js";

describe("loadConfig", () => {
  test("applies defaults when variables are unset", () => {
    assert.deepEqual(loadConfig({}), {
      port: 3000,
      nodeEnv: "development",
      databaseUrl: null,
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
});
