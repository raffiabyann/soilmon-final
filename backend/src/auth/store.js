import { createQuery } from "../db/query.js";

// Every value is passed as a parameter; the SQL text never contains request data.

const FIND_USER_BY_EMAIL = `
  SELECT id, email, password_hash, role
  FROM users
  WHERE email = $1::text`;

// A revoked key matches no row, exactly like a key that was never issued.
const FIND_ACTIVE_DEVICE = `
  SELECT n.id AS node_id, n.code AS node_code
  FROM device_credentials d
  JOIN nodes n ON n.id = d.node_id
  WHERE d.api_key_hash = $1::text
    AND d.revoked_at IS NULL`;

export function createAuthStore(db) {
  const query = createQuery(db);

  return {
    // Returns { id, email, role, passwordHash }, or null when no user has this email.
    // email must already be lowercase (see validateLoginInput).
    async findUserByEmail(email) {
      const { rows } = await query(FIND_USER_BY_EMAIL, [email]);
      if (rows.length === 0) return null;
      const row = rows[0];
      return { id: String(row.id), email: row.email, role: row.role, passwordHash: row.password_hash };
    },

    // Returns { nodeId, nodeCode } for an active key, or null.
    async findActiveDevice(apiKeyHash) {
      const { rows } = await query(FIND_ACTIVE_DEVICE, [apiKeyHash]);
      if (rows.length === 0) return null;
      return { nodeId: String(rows[0].node_id), nodeCode: rows[0].node_code };
    },
  };
}
