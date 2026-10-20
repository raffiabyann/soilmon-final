// Errors meaning the database cannot be reached or used right now, as opposed to a fault in a
// query. Callers report these as 503 so producers can retry later.
const NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

// SQLSTATE: 08 connection exception, 28 invalid authorization, 3D000 unknown database,
// 53300 too many connections, 57P01-57P03 server shutting down or not accepting connections.
const SQLSTATE_UNAVAILABLE = /^(08|28)|^(3D000|53300|57P01|57P02|57P03)$/;

// pg and pg-pool raise these without a code.
const UNAVAILABLE_MESSAGES = /timeout exceeded when trying to connect|Connection terminated/i;

export function isDatabaseUnavailable(err) {
  if (!err || typeof err !== "object") return false;
  const code = typeof err.code === "string" ? err.code : "";
  if (NETWORK_CODES.has(code) || SQLSTATE_UNAVAILABLE.test(code)) return true;
  return !code && UNAVAILABLE_MESSAGES.test(err.message ?? "");
}
