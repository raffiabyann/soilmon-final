import { createHash, randomBytes } from "node:crypto";

// A device key is 32 random bytes, sent as 43 base64url characters.
export const API_KEY_BYTES = 32;
const API_KEY_FORMAT = /^[A-Za-z0-9_-]{43}$/;

export function generateApiKey() {
  return randomBytes(API_KEY_BYTES).toString("base64url");
}

// SHA-256, not bcrypt. A key with 256 random bits cannot be guessed, so bcrypt's deliberate
// slowness adds nothing; and because SHA-256 has no salt, the same key always gives the same
// hash, so the key can be found with one indexed lookup instead of comparing against every row.
export function hashApiKey(apiKey) {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

// A value that could never have been issued is rejected without a database query.
export function isWellFormedApiKey(value) {
  return typeof value === "string" && API_KEY_FORMAT.test(value);
}
