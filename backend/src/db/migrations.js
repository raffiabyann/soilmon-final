import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const FILE_PATTERN = /^(\d{3})_([a-z0-9_]+)\.sql$/;
const DOWN_SUFFIX = ".down.sql";
// A COMMIT inside a file would end the runner's transaction early and break atomicity.
const TRANSACTION_STATEMENT = /^\s*(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\s*;/im;

// Arbitrary key shared by every runner, so two runners cannot apply migrations at the same time.
export const MIGRATION_LOCK_KEY = 7391001;

const CREATE_TRACKING_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    name       text NOT NULL,
    checksum   text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;

export class MigrationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MigrationError";
  }
}

// Line endings are normalised so a CRLF checkout does not look like an edited file.
export function checksum(sql) {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

export async function loadMigrations(dir) {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".sql") && !name.endsWith(DOWN_SUFFIX))
    .sort();

  const migrations = [];
  for (const name of names) {
    const match = FILE_PATTERN.exec(name);
    if (!match) {
      throw new MigrationError(`Unexpected migration file name "${name}"; expected NNN_name.sql.`);
    }
    const sql = await readFile(path.join(dir, name), "utf8");
    if (TRANSACTION_STATEMENT.test(sql)) {
      throw new MigrationError(`${name} must not contain BEGIN/COMMIT; the runner adds the transaction.`);
    }
    const version = match[1];
    if (migrations.some((m) => m.version === version)) {
      throw new MigrationError(`Duplicate migration version ${version}.`);
    }
    migrations.push({ version, name, sql, checksum: checksum(sql) });
  }
  return migrations;
}

// Returns the migrations still to apply, or throws when the history and the files disagree.
export function planMigrations(migrations, applied) {
  const byVersion = new Map(migrations.map((m) => [m.version, m]));

  for (const row of applied) {
    const file = byVersion.get(row.version);
    if (!file) {
      throw new MigrationError(`Migration ${row.version} (${row.name}) is applied but its file is missing.`);
    }
    if (file.checksum !== row.checksum) {
      throw new MigrationError(
        `${file.name} changed after it was applied. Add a new migration instead of editing it.`,
      );
    }
  }

  const appliedVersions = new Set(applied.map((row) => row.version));
  const latestApplied = applied.map((row) => row.version).sort().at(-1);
  const pending = migrations.filter((m) => !appliedVersions.has(m.version));

  for (const m of pending) {
    if (latestApplied !== undefined && m.version < latestApplied) {
      throw new MigrationError(
        `${m.name} is older than the latest applied migration ${latestApplied}; renumber it.`,
      );
    }
  }
  return pending;
}

async function readApplied(client) {
  const { rows } = await client.query("SELECT to_regclass('schema_migrations') IS NOT NULL AS present");
  if (!rows[0].present) return [];
  const result = await client.query("SELECT version, name, checksum FROM schema_migrations ORDER BY version");
  return result.rows;
}

// Dry run only reads: no tracking table, no lock, no transaction.
export async function runMigrations(client, migrations, { dryRun = false, log = console.log } = {}) {
  if (dryRun) {
    const pending = planMigrations(migrations, await readApplied(client));
    for (const m of pending) log(`pending: ${m.name}`);
    return pending;
  }

  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
  try {
    await client.query(CREATE_TRACKING_TABLE);
    const pending = planMigrations(migrations, await readApplied(client));

    for (const m of pending) {
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
          [m.version, m.name, m.checksum],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
      log(`applied: ${m.name}`);
    }
    return pending;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
  }
}
