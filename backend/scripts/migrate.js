// Applies pending migrations from ../migrations. Usage: npm run migrate | npm run migrate:plan
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigError, loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { MigrationError, loadMigrations, runMigrations } from "../src/db/migrations.js";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--dry-run");
  if (unknown.length > 0) {
    throw new MigrationError(`Unknown argument(s): ${unknown.join(" ")}. Only --dry-run is supported.`);
  }
  const dryRun = args.includes("--dry-run");

  const config = loadConfig();
  if (!config.databaseUrl) {
    throw new MigrationError("DATABASE_URL is not set.");
  }

  const migrations = await loadMigrations(MIGRATIONS_DIR);
  const client = await getPool(config).connect();
  try {
    const pending = await runMigrations(client, migrations, { dryRun });
    if (pending.length === 0) console.log("Nothing to apply.");
    else if (dryRun) console.log(`${pending.length} migration(s) pending. Nothing was changed.`);
  } finally {
    client.release();
  }
}

try {
  await main();
} catch (err) {
  const known = err instanceof MigrationError || err instanceof ConfigError;
  // pg errors carry a SQLSTATE code; neither they nor the message include the connection string.
  console.error(`Migration failed: ${known ? err.message : `${err.code ?? ""} ${err.message}`.trim()}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
