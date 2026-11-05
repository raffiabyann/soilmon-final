import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  TOKEN_ALGORITHM,
  TOKEN_TTL_SECONDS,
  signAccessToken,
  verifyAccessToken,
} from "../src/auth/tokens.js";
import { generateApiKey, hashApiKey, isWellFormedApiKey } from "../src/auth/apiKeys.js";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "../src/auth/passwords.js";

const SECRET = "test-secret-that-is-at-least-32-chars";
const ADMIN = { id: "3", role: "admin" };

function segments(token) {
  return token.split(".").map((part, i) => (i < 2 ? JSON.parse(Buffer.from(part, "base64url")) : part));
}

// Replaces one character in the middle of a token segment with a different one.
function changeOneCharacter(token, segment) {
  const parts = token.split(".");
  const middle = Math.floor(parts[segment].length / 2);
  const original = parts[segment][middle];
  parts[segment] =
    parts[segment].slice(0, middle) + (original === "A" ? "B" : "A") + parts[segment].slice(middle + 1);
  return parts.join(".");
}

describe("access tokens", () => {
  test("the payload holds exactly sub, role, iat and exp, signed with HS256", () => {
    const [header, payload] = segments(signAccessToken(ADMIN, SECRET));
    assert.equal(header.alg, TOKEN_ALGORITHM);
    assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
    assert.equal(payload.sub, "3");
    assert.equal(payload.role, "admin");
    assert.equal(payload.exp - payload.iat, TOKEN_TTL_SECONDS);
  });

  test("a token the server signed verifies to { id, role }", () => {
    assert.deepEqual(verifyAccessToken(signAccessToken(ADMIN, SECRET), SECRET), ADMIN);
  });

  test("changing one character of the payload or the signature invalidates the token", () => {
    const token = signAccessToken(ADMIN, SECRET);
    assert.equal(verifyAccessToken(changeOneCharacter(token, 1), SECRET), null);
    assert.equal(verifyAccessToken(changeOneCharacter(token, 2), SECRET), null);
  });

  test("a token signed with another secret is rejected", () => {
    const token = signAccessToken(ADMIN, "another-secret-that-is-32-chars-long");
    assert.equal(verifyAccessToken(token, SECRET), null);
  });

  test('an unsigned token with alg "none" is rejected', () => {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub: "1", role: "admin", iat: now, exp: now + 60 })}.`;
    assert.equal(verifyAccessToken(token, SECRET), null);
  });

  test("a token signed with the same secret but another HMAC algorithm is rejected", () => {
    const token = jwt.sign({ role: "admin" }, SECRET, { algorithm: "HS512", subject: "3" });
    assert.equal(verifyAccessToken(token, SECRET), null);
  });

  test("a token signed with an asymmetric algorithm is rejected", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const token = jwt.sign({ role: "admin" }, privateKey, { algorithm: "RS256", subject: "3" });
    assert.equal(verifyAccessToken(token, SECRET), null);
  });

  test("an expired token is rejected", () => {
    const past = Math.floor(Date.now() / 1000) - 120;
    const token = jwt.sign({ sub: "3", role: "admin", iat: past - 60, exp: past }, SECRET, {
      algorithm: "HS256",
    });
    assert.equal(verifyAccessToken(token, SECRET), null);
  });

  for (const [label, payload] of [
    ["an unknown role", { sub: "3", role: "superuser" }],
    ["no role", { sub: "3" }],
    ["a non-numeric subject", { sub: "admin", role: "admin" }],
    ["no subject", { role: "admin" }],
  ]) {
    test(`a correctly signed token with ${label} is rejected`, () => {
      const token = jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn: 60 });
      assert.equal(verifyAccessToken(token, SECRET), null);
    });
  }

  for (const garbage of ["", "abc", "a.b.c", "Bearer x"]) {
    test(`a malformed token ${JSON.stringify(garbage)} is rejected`, () => {
      assert.equal(verifyAccessToken(garbage, SECRET), null);
    });
  }
});

describe("device API keys", () => {
  test("keys are 43 base64url characters and never repeat", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    assert.match(a, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(a, b);
    assert.equal(isWellFormedApiKey(a), true);
  });

  test("the stored hash is the 64-character SHA-256 hex digest, the same for the same key", () => {
    const key = generateApiKey();
    assert.match(hashApiKey(key), /^[0-9a-f]{64}$/);
    assert.equal(hashApiKey(key), hashApiKey(key));
    assert.notEqual(hashApiKey(key), hashApiKey(generateApiKey()));
    assert.equal(hashApiKey(key).includes(key), false);
  });

  for (const value of [undefined, "", "short", "x".repeat(44), `${"a".repeat(42)}!`, 42]) {
    test(`${JSON.stringify(value) ?? "undefined"} is not a well-formed key`, () => {
      assert.equal(isWellFormedApiKey(value), false);
    });
  }
});

describe("passwords", () => {
  test("a bcrypt hash verifies the right password only and does not contain it", async () => {
    const hash = await hashPassword("correct horse", 4);
    assert.match(hash, /^\$2[aby]\$04\$/);
    assert.equal(hash.includes("correct horse"), false);
    assert.equal(await verifyPassword("correct horse", hash), true);
    assert.equal(await verifyPassword("correct hors", hash), false);
  });

  test("two hashes of the same password differ because of the salt", async () => {
    assert.notEqual(await hashPassword("same", 4), await hashPassword("same", 4));
  });

  test("the dummy check always fails", async () => {
    assert.equal(await verifyAgainstDummy("soilmon-dummy-password"), false);
    assert.equal(await verifyAgainstDummy("anything"), false);
  });
});
