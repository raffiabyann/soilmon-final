import { ACCESS, canReadNode, findNodeAccess } from "../auth/access.js";
import { createQuery } from "../db/query.js";

// Every value is passed as a parameter; the SQL text never contains request data.
//
// Reads take the caller as user = { id, role } and filter by ownership inside SQL (canReadNode).
// Single-node reads first resolve access (404 / 403, see auth/access.js) and then run a data
// query that repeats the ownership condition, so it returns nothing to a caller without access
// even if the first check were skipped.

// Inserts only when the node is registered: an unknown nodeCode inserts nothing.
const INSERT_RECORD = `
  INSERT INTO telemetry_records (node_id, measured_at, raw_registers, battery_voltage)
  SELECT id, $2::timestamptz, $3::integer[], $4::double precision
  FROM nodes
  WHERE code = $1::text
  RETURNING id, received_at, measured_at, raw_registers, battery_voltage`;

// The table is named in full: inside canReadNode's subquery an unqualified node_id would
// resolve to user_nodes.node_id.
const LIST_RECORDS = `
  SELECT id, received_at, measured_at, raw_registers, battery_voltage
  FROM telemetry_records
  WHERE node_id = $1
    AND ${canReadNode({ nodeId: "telemetry_records.node_id", role: "$5", userId: "$6" })}
    AND ($2::timestamptz IS NULL OR received_at >= $2::timestamptz)
    AND ($3::timestamptz IS NULL OR received_at < $3::timestamptz)
  ORDER BY received_at DESC, id DESC
  LIMIT $4`;

// lastReceivedAt comes from the (node_id, received_at) index: one index lookup per node.
const NODE_COLUMNS = `
  n.code,
  (SELECT max(t.received_at) FROM telemetry_records t WHERE t.node_id = n.id) AS last_received_at`;

const LIST_NODES = `
  SELECT ${NODE_COLUMNS}
  FROM nodes n
  WHERE ${canReadNode({ nodeId: "n.id", role: "$1", userId: "$2" })}
  ORDER BY n.code`;

const GET_NODE = `
  SELECT ${NODE_COLUMNS}
  FROM nodes n
  WHERE n.id = $1
    AND ${canReadNode({ nodeId: "n.id", role: "$2", userId: "$3" })}`;

function toNode(row) {
  return {
    code: row.code,
    lastReceivedAt: row.last_received_at ? row.last_received_at.toISOString() : null,
  };
}

function toRecord(row, nodeCode) {
  return {
    id: String(row.id),
    nodeCode,
    receivedAt: row.received_at.toISOString(),
    measuredAt: row.measured_at ? row.measured_at.toISOString() : null,
    rawRegisters: row.raw_registers,
    batteryVoltage: row.battery_voltage,
  };
}

// db is anything with pg's query(text, params) method: a Pool, a Client or a test double.
export function createTelemetryStore(db) {
  const query = createQuery(db);

  return {
    // The nodes the caller may read, ordered by code: every node for an admin.
    async listNodes(user) {
      const { rows } = await query(LIST_NODES, [user.role, user.id]);
      return rows.map(toNode);
    },

    // Returns { access, node }. node is set only when access is granted.
    async getNode(nodeCode, user) {
      const { access, nodeId } = await findNodeAccess(query, nodeCode, user);
      if (access !== ACCESS.GRANTED) return { access };
      const { rows } = await query(GET_NODE, [nodeId, user.role, user.id]);
      // No row: the assignment was removed between the two queries.
      if (rows.length === 0) return { access: ACCESS.DENIED };
      return { access, node: toNode(rows[0]) };
    },

    // Returns the stored record, or null when nodeCode is not a registered node.
    async insertRecord({ nodeCode, rawRegisters, batteryVoltage, measuredAt }) {
      const { rows } = await query(INSERT_RECORD, [
        nodeCode,
        measuredAt,
        rawRegisters,
        batteryVoltage,
      ]);
      return rows.length > 0 ? toRecord(rows[0], nodeCode) : null;
    },

    // Returns { access, records }: the node's records, newest first, when access is granted.
    async listRecords(nodeCode, { limit, from, to }, user) {
      const { access, nodeId } = await findNodeAccess(query, nodeCode, user);
      if (access !== ACCESS.GRANTED) return { access };
      const { rows } = await query(LIST_RECORDS, [nodeId, from, to, limit, user.role, user.id]);
      return { access, records: rows.map((row) => toRecord(row, nodeCode)) };
    },
  };
}
