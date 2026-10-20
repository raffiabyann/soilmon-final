import pg from "pg";

let pool = null;

// The pool connects lazily: no connection is opened until the first query.
export function getPool(config) {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not set; the database is not configured.");
  }
  if (!pool) {
    pool = new pg.Pool({ connectionString: config.databaseUrl });
    pool.on("error", (err) => {
      console.error("PostgreSQL idle client error:", err.message);
    });
  }
  return pool;
}

export async function closePool() {
  if (!pool) return;
  const closing = pool;
  pool = null;
  await closing.end();
}
