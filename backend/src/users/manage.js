import { PASSWORD_MAX_BYTES } from "../auth/passwords.js";
import { isPlausibleEmail } from "../auth/validate.js";

// Account management for the user:create and user:set-password scripts. Only the users and
// user_nodes tables are written. device_credentials and telemetry_records are never touched, so a
// password change cannot rotate a device key.

export const PASSWORD_MIN_LENGTH = 12;

// A message that is safe to print as it is: no SQL, no connection string, no password.
export class UserCommandError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserCommandError";
  }
}

// Stored lowercase: the users table rejects anything else and login lowercases the same way.
export function normalizeEmail(raw) {
  if (!isPlausibleEmail(raw)) {
    throw new UserCommandError("--email must be an email address of at most 254 characters.");
  }
  return raw.toLowerCase();
}

export function checkPassword(password) {
  if ([...password].length < PASSWORD_MIN_LENGTH) {
    throw new UserCommandError(`The password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  // bcrypt reads only the first 72 bytes, and login refuses longer input.
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    throw new UserCommandError(`The password must be at most ${PASSWORD_MAX_BYTES} bytes.`);
  }
}

const FIND_USER = "SELECT id, role FROM users WHERE email = $1::text";
const FIND_NODES = "SELECT code FROM nodes WHERE code = ANY($1::text[])";
const INSERT_USER = `
  INSERT INTO users (email, password_hash, role) VALUES ($1::text, $2::text, $3::text)
  ON CONFLICT (email) DO NOTHING
  RETURNING id`;
const ASSIGN_NODES = `
  INSERT INTO user_nodes (user_id, node_id)
  SELECT $1::bigint, id FROM nodes WHERE code = ANY($2::text[])`;
const UPDATE_PASSWORD = `
  UPDATE users SET password_hash = $2::text WHERE email = $1::text
  RETURNING id, role`;

// db is a pg Client or Pool, or a test double with query(text, params).
export async function findUser(db, email) {
  const { rows } = await db.query(FIND_USER, [email]);
  return rows[0] ? { id: String(rows[0].id), role: rows[0].role } : null;
}

export async function findMissingNodes(db, codes) {
  if (codes.length === 0) return [];
  const { rows } = await db.query(FIND_NODES, [codes]);
  const known = new Set(rows.map((r) => r.code));
  return codes.filter((code) => !known.has(code));
}

// Returns the new id, or null when the email is already registered. Run inside a transaction.
export async function insertUser(db, { email, passwordHash, role, nodes }) {
  const { rows } = await db.query(INSERT_USER, [email, passwordHash, role]);
  if (rows.length === 0) return null;
  const id = String(rows[0].id);
  if (nodes.length > 0) await db.query(ASSIGN_NODES, [id, nodes]);
  return id;
}

// Returns { id, role }, or null when no user has this email. Role and node assignments stay as they are.
export async function updatePassword(db, { email, passwordHash }) {
  const { rows } = await db.query(UPDATE_PASSWORD, [email, passwordHash]);
  return rows[0] ? { id: String(rows[0].id), role: rows[0].role } : null;
}
