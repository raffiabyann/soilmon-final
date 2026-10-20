import { isDatabaseUnavailable } from "../db/errors.js";
import { ApiError } from "../middleware/errors.js";

// Every value is passed as a parameter; the SQL text never contains request data.

// Inserts only when the node is registered: an unknown nodeCode inserts nothing.
const INSERT_RECORD = `
  INSERT INTO telemetry_records (node_id, measured_at, raw_registers, battery_voltage)
  SELECT id, $2::timestamptz, $3::integer[], $4::double precision
  FROM nodes
  WHERE code = $1::text
  RETURNING id, received_at, measured_at, raw_registers, battery_voltage`;

const FIND_NODE = "SELECT id FROM nodes WHERE code = $1::text";

const LIST_RECORDS = `
  SELECT id, received_at, measured_at, raw_registers, battery_voltage
  FROM telemetry_records
  WHERE node_id = $1
    AND ($2::timestamptz IS NULL OR received_at >= $2::timestamptz)
    AND ($3::timestamptz IS NULL OR received_at < $3::timestamptz)
  ORDER BY received_at DESC, id DESC
  LIMIT $4`;

// lastReceivedAt comes from the (node_id, received_at) index: one index lookup per node.
const NODE_COLUMNS = `
  n.code,
  (SELECT max(t.received_at) FROM telemetry_records t WHERE t.node_id = n.id) AS last_received_at`;

const LIST_NODES = `SELECT ${NODE_COLUMNS} FROM nodes n ORDER BY n.code`;

const GET_NODE = `SELECT ${NODE_COLUMNS} FROM nodes n WHERE n.code = $1::text`;

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
  async function query(text, params) {
    try {
      return await db.query(text, params);
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new ApiError(503, "database_unavailable", "The database is not available.");
      }
      throw err;
    }
  }

  return {
    // Every registered node, ordered by code.
    async listNodes() {
      const { rows } = await query(LIST_NODES, []);
      return rows.map(toNode);
    },

    // Returns the node, or null when nodeCode is not registered.
    async getNode(nodeCode) {
      const { rows } = await query(GET_NODE, [nodeCode]);
      return rows.length > 0 ? toNode(rows[0]) : null;
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

    // Returns the node's records, newest first, or null when the node is not registered.
    async listRecords(nodeCode, { limit, from, to }) {
      const node = await query(FIND_NODE, [nodeCode]);
      if (node.rows.length === 0) return null;
      const { rows } = await query(LIST_RECORDS, [node.rows[0].id, from, to, limit]);
      return rows.map((row) => toRecord(row, nodeCode));
    },
  };
}
