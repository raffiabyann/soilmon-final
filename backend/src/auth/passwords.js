import bcrypt from "bcrypt";

// Work factor for new hashes: each step doubles the time a guess costs, for the server and for an
// attacker who has stolen the hashes alike. Verification reads the factor from the stored hash.
export const BCRYPT_COST = 12;

// bcrypt only reads the first 72 bytes of its input, so longer passwords are refused instead of
// being silently truncated.
export const PASSWORD_MAX_BYTES = 72;

export function hashPassword(password, cost = BCRYPT_COST) {
  return bcrypt.hash(password, cost);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

let dummyHash = null;

// Used when the email is not registered. It does the same bcrypt work as a real check and always
// fails, so the response time does not reveal whether an account exists.
export async function verifyAgainstDummy(password) {
  dummyHash ??= bcrypt.hash("soilmon-dummy-password", BCRYPT_COST);
  await bcrypt.compare(password, await dummyHash);
  return false;
}
