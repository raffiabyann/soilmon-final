import { ACCESS, canReadNode, findNodeAccess } from "../auth/access.js";
import { createQuery } from "../db/query.js";

// Every value is passed as a parameter; the SQL text never contains request data.
// Access works as in telemetry/store.js: resolve access first, then a data query that repeats
// the ownership (read) or role (write) condition in SQL.

// A node without a node_config row still returns one row, with null values.
const GET_CONFIG = `
  SELECT c.moisture_threshold, c.pump_duration_sec, c.updated_by, c.updated_at
  FROM nodes n
  LEFT JOIN node_config c ON c.node_id = n.id
  WHERE n.id = $1
    AND ${canReadNode({ nodeId: "n.id", role: "$2", userId: "$3" })}`;

// The device path. The node id comes from the verified API key, so there is no user and no
// ownership condition: the key already is the proof of ownership.
const GET_DEVICE_CONFIG = `
  SELECT c.moisture_threshold, c.pump_duration_sec, c.updated_by, c.updated_at
  FROM nodes n
  LEFT JOIN node_config c ON c.node_id = n.id
  WHERE n.id = $1`;

// Creates the row on the first change. $5 and $7 say whether moistureThreshold and
// pumpDurationSec were sent: a field that was not sent keeps its stored value.
// "$3 = 'admin'" repeats requireAdmin inside SQL, so a non-admin caller writes nothing even if a
// route forgot the middleware.
const UPSERT_CONFIG = `
  INSERT INTO node_config (node_id, moisture_threshold, pump_duration_sec, updated_by)
  SELECT n.id, $4::double precision, $6::integer, $2::bigint
  FROM nodes n
  WHERE n.id = $1
    AND $3::text = 'admin'
  ON CONFLICT (node_id) DO UPDATE SET
    moisture_threshold = CASE WHEN $5::boolean THEN EXCLUDED.moisture_threshold
                              ELSE node_config.moisture_threshold END,
    pump_duration_sec  = CASE WHEN $7::boolean THEN EXCLUDED.pump_duration_sec
                              ELSE node_config.pump_duration_sec END,
    updated_by = EXCLUDED.updated_by,
    updated_at = now()
  RETURNING moisture_threshold, pump_duration_sec, updated_by, updated_at`;

function toConfig(row, nodeCode) {
  return {
    nodeCode,
    moistureThreshold: row.moisture_threshold,
    pumpDurationSec: row.pump_duration_sec,
    updatedBy: row.updated_by === null ? null : String(row.updated_by),
    updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
  };
}

export function createNodeConfigStore(db) {
  const query = createQuery(db);

  return {
    // Returns { access, config }. config is set only when access is granted.
    async getConfig(nodeCode, user) {
      const { access, nodeId } = await findNodeAccess(query, nodeCode, user);
      if (access !== ACCESS.GRANTED) return { access };
      const { rows } = await query(GET_CONFIG, [nodeId, user.role, user.id]);
      if (rows.length === 0) return { access: ACCESS.DENIED };
      return { access, config: toConfig(rows[0], nodeCode) };
    },

    // device is { nodeId, nodeCode } from requireDeviceKey. Returns { access, config }; access is
    // "missing" only if the node was deleted while its key was still active.
    async getDeviceConfig(device) {
      const { rows } = await query(GET_DEVICE_CONFIG, [device.nodeId]);
      if (rows.length === 0) return { access: ACCESS.MISSING };
      return { access: ACCESS.GRANTED, config: toConfig(rows[0], device.nodeCode) };
    },

    // Applies the fields present in changes. Returns { access, config }.
    async updateConfig(nodeCode, changes, user) {
      const { access, nodeId } = await findNodeAccess(query, nodeCode, user);
      if (access !== ACCESS.GRANTED) return { access };
      const setThreshold = "moistureThreshold" in changes;
      const setDuration = "pumpDurationSec" in changes;
      const { rows } = await query(UPSERT_CONFIG, [
        nodeId,
        user.id,
        user.role,
        setThreshold ? changes.moistureThreshold : null,
        setThreshold,
        setDuration ? changes.pumpDurationSec : null,
        setDuration,
      ]);
      // No row: the caller is not an admin, so nothing was written.
      if (rows.length === 0) return { access: ACCESS.DENIED };
      return { access, config: toConfig(rows[0], nodeCode) };
    },
  };
}
