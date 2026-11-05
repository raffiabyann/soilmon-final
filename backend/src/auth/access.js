import { ApiError } from "../middleware/errors.js";

// Ownership is decided inside SQL, never by filtering rows in JavaScript after they were read.
// Every query that returns node data includes this condition in its WHERE clause, so a query run
// for a caller without access returns no rows at all.
//
// The arguments are SQL text, not values: nodeId is a column reference such as "n.id", role and
// userId are parameter placeholders such as "$2". Values are still passed only as parameters.
export function canReadNode({ nodeId, role, userId }) {
  return `(${role}::text = 'admin' OR EXISTS (
      SELECT 1 FROM user_nodes un
      WHERE un.node_id = ${nodeId} AND un.user_id = ${userId}::bigint))`;
}

// One row per existing node code: its id and whether the caller may read it. It returns no node
// data, only existence and permission, so that a 404 (no such node) can be told apart from a 403
// (the node exists but is not the caller's).
const FIND_NODE_ACCESS = `
  SELECT n.id, ${canReadNode({ nodeId: "n.id", role: "$2", userId: "$3" })} AS allowed
  FROM nodes n
  WHERE n.code = $1::text`;

export const ACCESS = Object.freeze({
  MISSING: "missing",
  DENIED: "denied",
  GRANTED: "granted",
});

// Returns { access, nodeId }. user is { id, role } from the verified token.
export async function findNodeAccess(query, nodeCode, user) {
  const { rows } = await query(FIND_NODE_ACCESS, [nodeCode, user.role, user.id]);
  if (rows.length === 0) return { access: ACCESS.MISSING, nodeId: null };
  const { id, allowed } = rows[0];
  return { access: allowed ? ACCESS.GRANTED : ACCESS.DENIED, nodeId: allowed ? String(id) : null };
}

// Turns a store result into a 404 or 403, or returns it when access was granted.
export function requireGranted(result) {
  if (result.access === ACCESS.MISSING) {
    throw new ApiError(404, "not_found", "Node not found.");
  }
  if (result.access !== ACCESS.GRANTED) {
    throw new ApiError(403, "forbidden", "You do not have access to this node.");
  }
  return result;
}
