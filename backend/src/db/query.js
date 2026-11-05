import { isDatabaseUnavailable } from "./errors.js";
import { ApiError } from "../middleware/errors.js";

// Wraps db.query so that an unreachable database becomes a 503 for the client. Every store uses
// it. db is anything with pg's query(text, params) method: a Pool, a Client or a test double.
export function createQuery(db) {
  return async function query(text, params) {
    try {
      return await db.query(text, params);
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new ApiError(503, "database_unavailable", "The database is not available.");
      }
      throw err;
    }
  };
}
