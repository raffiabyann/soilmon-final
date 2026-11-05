import jwt from "jsonwebtoken";
import { ROLES } from "./roles.js";

// The only algorithm the server signs with and the only one it accepts. Fixing the list on
// verification stops a token from choosing its own algorithm through its header, such as
// "none" (no signature) or an asymmetric algorithm that would treat the secret as a public key.
export const TOKEN_ALGORITHM = "HS256";
export const TOKEN_TTL_SECONDS = 60 * 60;

// The payload is { sub, role, iat, exp }: sub is the user id, iat and exp are added by the
// library. Nothing else is put in it, because a JWT is signed, not encrypted.
export function signAccessToken(user, secret) {
  return jwt.sign({ role: user.role }, secret, {
    algorithm: TOKEN_ALGORITHM,
    subject: String(user.id),
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

// Returns { id, role }, or null when the token is malformed, tampered with, signed with another
// key or algorithm, expired, or carries a payload this server never issues.
export function verifyAccessToken(token, secret) {
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: [TOKEN_ALGORITHM] });
  } catch (err) {
    // TokenExpiredError and NotBeforeError are subclasses of JsonWebTokenError. A payload segment
    // that decodes to broken JSON escapes as a plain SyntaxError from the library's decoder; it
    // is still a bad token from the client, not a server fault.
    if (err instanceof jwt.JsonWebTokenError || err instanceof SyntaxError) return null;
    throw err;
  }

  const { sub, role } = payload;
  if (typeof sub !== "string" || !/^[0-9]+$/.test(sub) || !ROLES.includes(role)) return null;
  return { id: sub, role };
}
