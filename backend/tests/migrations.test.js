import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MIGRATION_LOCK_KEY,
  MigrationError,
  checksum,
  loadMigrations,
  planMigrations,
  runMigrations,
} from "../src/db/migrations.js";

const REPO_MIGRATIONS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

function migration(version, sql = `CREATE TABLE t${version} (id int);`) {
  return { version, name: `${version}_t.sql`, sql, checksum: checksum(sql) };
}

function appliedRow(m) {
  return { version: m.version, name: m.name, checksum: m.checksum };
}

// Answers the runner's queries; `applied` plays the schema_migrations table.
function fakeClient({ applied = [], tablePresent = true, failOn = null } = {}) {
  const calls = [];
  return {
    calls,
    texts: () => calls.map(({ text }) => text.trim().split(/\s+/).slice(0, 2).join(" ")),
    async query(text, params) {
      calls.push({ text, params });
      if (failOn && text === failOn) throw new Error("boom");
      if (text.includes("to_regclass")) return { rows: [{ present: tablePresent }] };
      if (text.startsWith("SELECT version, name, checksum")) return { rows: applied };
      return { rows: [] };
    },
  };
}

describe("loadMigrations", () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "soilmon-migrations-"));
  });

  after(() => rm(dir, { recursive: true, force: true }));

  async function fresh(files) {
    await rm(dir, { recursive: true, force: true });
    dir = await mkdtemp(path.join(os.tmpdir(), "soilmon-migrations-"));
    for (const [name, sql] of Object.entries(files)) await writeFile(path.join(dir, name), sql);
    return dir;
  }

  test("loads files in version order and ignores .down.sql", async () => {
    const loaded = await loadMigrations(
      await fresh({
        "002_b.sql": "SELECT 2;",
        "001_a.sql": "SELECT 1;",
        "001_a.down.sql": "DROP TABLE x;",
        "README.txt": "not a migration",
      }),
    );
    assert.deepEqual(
      loaded.map((m) => m.name),
      ["001_a.sql", "002_b.sql"],
    );
  });

  test("rejects an unexpected file name", async () => {
    await assert.rejects(loadMigrations(await fresh({ "1_a.sql": "SELECT 1;" })), MigrationError);
  });

  test("rejects a duplicate version", async () => {
    await assert.rejects(
      loadMigrations(await fresh({ "001_a.sql": "SELECT 1;", "001_b.sql": "SELECT 2;" })),
      MigrationError,
    );
  });

  for (const statement of ["BEGIN;", "COMMIT;", "rollback ;", "START TRANSACTION;"]) {
    test(`rejects a file containing ${statement}`, async () => {
      await assert.rejects(
        loadMigrations(await fresh({ "001_a.sql": `${statement}\nSELECT 1;` })),
        MigrationError,
      );
    });
  }

  test("the repository's migrations load and contain no transaction statements", async () => {
    const loaded = await loadMigrations(REPO_MIGRATIONS);
    assert.deepEqual(
      loaded.map((m) => m.name),
      ["001_create_telemetry.sql"],
    );
  });
});

describe("checksum", () => {
  test("ignores CRLF versus LF line endings", () => {
    assert.equal(checksum("SELECT 1;\r\nSELECT 2;\r\n"), checksum("SELECT 1;\nSELECT 2;\n"));
  });

  test("changes when the SQL changes", () => {
    assert.notEqual(checksum("SELECT 1;"), checksum("SELECT 2;"));
  });
});

describe("planMigrations", () => {
  const m1 = migration("001");
  const m2 = migration("002");

  test("everything is pending on an empty database", () => {
    assert.deepEqual(planMigrations([m1, m2], []), [m1, m2]);
  });

  test("applied migrations with the same checksum are skipped", () => {
    assert.deepEqual(planMigrations([m1, m2], [appliedRow(m1)]), [m2]);
    assert.deepEqual(planMigrations([m1, m2], [appliedRow(m1), appliedRow(m2)]), []);
  });

  test("an applied file that was edited stops the run", () => {
    const edited = { ...m1, sql: "CREATE TABLE changed (id int);", checksum: checksum("changed") };
    assert.throws(() => planMigrations([edited], [appliedRow(m1)]), /changed after it was applied/);
  });

  test("an applied migration whose file is missing stops the run", () => {
    assert.throws(() => planMigrations([m2], [appliedRow(m1), appliedRow(m2)]), /file is missing/);
  });

  test("a new migration numbered below the latest applied one stops the run", () => {
    const m3 = migration("003");
    assert.throws(
      () => planMigrations([m1, m2, m3], [appliedRow(m1), appliedRow(m3)]),
      /older than the latest applied/,
    );
  });
});

describe("runMigrations", () => {
  const m1 = migration("001");
  const m2 = migration("002");
  const quiet = { log: () => {} };

  test("applies each pending migration and its record in one transaction, under a lock", async () => {
    const client = fakeClient({ applied: [appliedRow(m1)] });
    const applied = await runMigrations(client, [m1, m2], quiet);

    assert.deepEqual(applied, [m2]);
    assert.deepEqual(client.texts(), [
      "SELECT pg_advisory_lock($1)",
      "CREATE TABLE",
      "SELECT to_regclass('schema_migrations')",
      "SELECT version,",
      "BEGIN",
      "CREATE TABLE",
      "INSERT INTO",
      "COMMIT",
      "SELECT pg_advisory_unlock($1)",
    ]);
    assert.deepEqual(client.calls[0].params, [MIGRATION_LOCK_KEY]);
    assert.equal(client.calls[5].text, m2.sql);
    assert.deepEqual(client.calls[6].params, ["002", m2.name, m2.checksum]);
  });

  test("a second run applies nothing", async () => {
    const client = fakeClient({ applied: [appliedRow(m1), appliedRow(m2)] });
    assert.deepEqual(await runMigrations(client, [m1, m2], quiet), []);
    assert.equal(client.texts().includes("BEGIN"), false);
  });

  test("a failing migration is rolled back, not recorded, and the lock is released", async () => {
    const client = fakeClient({ failOn: m1.sql });
    await assert.rejects(runMigrations(client, [m1, m2], quiet), /boom/);
    const texts = client.texts();
    assert.equal(texts.includes("INSERT INTO"), false);
    assert.equal(texts.includes("COMMIT"), false);
    assert.deepEqual(texts.slice(-2), ["ROLLBACK", "SELECT pg_advisory_unlock($1)"]);
  });

  test("a plan error releases the lock and runs nothing", async () => {
    const edited = { ...m1, checksum: "different" };
    const client = fakeClient({ applied: [appliedRow(m1)] });
    await assert.rejects(runMigrations(client, [edited], quiet), MigrationError);
    assert.equal(client.texts().includes("BEGIN"), false);
    assert.equal(client.texts().at(-1), "SELECT pg_advisory_unlock($1)");
  });

  test("dry run only reads: no lock, no tracking table, no transaction", async () => {
    const client = fakeClient({ tablePresent: false });
    const lines = [];
    const pending = await runMigrations(client, [m1, m2], { dryRun: true, log: (l) => lines.push(l) });

    assert.deepEqual(pending, [m1, m2]);
    assert.deepEqual(client.texts(), ["SELECT to_regclass('schema_migrations')"]);
    assert.deepEqual(lines, ["pending: 001_t.sql", "pending: 002_t.sql"]);
  });
});
