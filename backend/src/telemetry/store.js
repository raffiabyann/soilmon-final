import pg from "pg";
import { ACCESS, canReadNode, findNodeAccess } from "../auth/access.js";
import { createQuery } from "../db/query.js";
import { isDatabaseUnavailable } from "../db/errors.js";
import { ApiError } from "../middleware/errors.js";

// Every value is passed as a parameter; the SQL text never contains request data.
//
// Reads take the caller as user = { id, role } and filter by ownership inside SQL (canReadNode).
// Single-node reads first resolve access (404 / 403, see auth/access.js) and then run a data
// query that repeats the ownership condition, so it returns nothing to a caller without access
// even if the first check were skipped.

// Registers are stored as r1..r7 (migration 004) but read and written as one array, so the API
// keeps its rawRegisters shape.
const RECORD_COLUMNS = `
  id, received_at, measured_at, ARRAY[r1, r2, r3, r4, r5, r6, r7] AS raw_registers,
  battery_voltage, seq`;

// Inserts only when the node is registered: an unknown nodeCode inserts nothing.
const INSERT_RECORD = `
  INSERT INTO telemetry_records
    (node_id, measured_at, r1, r2, r3, r4, r5, r6, r7, battery_voltage, seq)
  SELECT id, $2::timestamptz,
    ($3::integer[])[1], ($3::integer[])[2], ($3::integer[])[3], ($3::integer[])[4],
    ($3::integer[])[5], ($3::integer[])[6], ($3::integer[])[7],
    $4::double precision, $5::integer
  FROM nodes
  WHERE code = $1::text
  RETURNING ${RECORD_COLUMNS}`;

// Two-key form, so it cannot collide with the migration runner's single-key lock.
export const SEQ_LOCK_CLASS = 7391002;
export const DUPLICATE_WINDOW_MINUTES = 10;

const FIND_NODE_ID = "SELECT id FROM nodes WHERE code = $1::text";
// Folding the id into int4 can only make two nodes share a lock, never skip one.
const LOCK_NODE = `SELECT pg_advisory_xact_lock(${SEQ_LOCK_CLASS}, ($1::bigint % 2147483647)::integer)`;
const FIND_DUPLICATE = `
  SELECT ${RECORD_COLUMNS}
  FROM telemetry_records
  WHERE node_id = $1 AND seq = $2::integer
    AND received_at > now() - interval '${DUPLICATE_WINDOW_MINUTES} minutes'
  ORDER BY received_at DESC, id DESC
  LIMIT 1`;

// The table is named in full: inside canReadNode's subquery an unqualified node_id would
// resolve to user_nodes.node_id.
const LIST_RECORDS = `
  SELECT ${RECORD_COLUMNS}
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
    seq: row.seq ?? null,
  };
}

// The duplicate check and the insert must see each other across concurrent deliveries, so they
// run in one transaction behind a per-node lock. Given a Pool, a connection is checked out for
// it; given a single client (the tests), the caller's transaction is used.
async function withTransaction(db, work) {
  if (!(db instanceof pg.Pool)) return work(createQuery(db));
  let client;
  try {
    client = await db.connect();
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new ApiError(503, "database_unavailable", "The database is not available.");
    }
    throw err;
  }
  const query = createQuery(client);
  try {
    await query("BEGIN");
    const result = await work(query);
    await query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
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

    // Returns { record, duplicate }, or null when nodeCode is not a registered node.
    // With a seq, the same node and seq within DUPLICATE_WINDOW_MINUTES is not stored again:
    // the earlier record is returned with duplicate: true.
    async insertRecord({ nodeCode, rawRegisters, batteryVoltage, measuredAt, seq = null }) {
      const params = [nodeCode, measuredAt, rawRegisters, batteryVoltage, seq];
      if (seq === null) {
        const { rows } = await query(INSERT_RECORD, params);
        return rows.length > 0 ? { record: toRecord(rows[0], nodeCode), duplicate: false } : null;
      }
      return withTransaction(db, async (tx) => {
        const node = await tx(FIND_NODE_ID, [nodeCode]);
        if (node.rows.length === 0) return null;
        const nodeId = node.rows[0].id;
        await tx(LOCK_NODE, [nodeId]);
        const earlier = await tx(FIND_DUPLICATE, [nodeId, seq]);
        if (earlier.rows.length > 0) {
          return { record: toRecord(earlier.rows[0], nodeCode), duplicate: true };
        }
        const { rows } = await tx(INSERT_RECORD, params);
        return rows.length > 0 ? { record: toRecord(rows[0], nodeCode), duplicate: false } : null;
      });
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
