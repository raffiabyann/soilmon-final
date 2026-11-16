// Runs only when TEST_DATABASE_URL points at a dedicated test database migrated to 005.
// Each test rolls the schema back to the integer[] shape with the down files, fills it, applies
// 004 and 005 again and checks every row, all inside a transaction that is rolled back.
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { refusalReason } from "./helpers/testDatabase.js";

const url = process.env.TEST_DATABASE_URL;
const skip = url ? false : "TEST_DATABASE_URL is not set";

const sql = (name) => readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");

async function columns(client) {
  const { rows } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'telemetry_records'",
  );
  return rows.map((r) => r.column_name).sort();
}

describe("migration 004: raw_registers array to r1..r7", { skip }, () => {
  let client;

  before(async () => {
    if (skip) return;
    const reason = refusalReason(url);
    if (reason) throw new Error(`Refusing to run integration tests: ${reason}`);
    client = await getPool(loadConfig({ DATABASE_URL: url })).connect();
  });

  after(async () => {
    client?.release();
    await closePool();
  });

  beforeEach(() => client?.query("BEGIN"));
  afterEach(() => client?.query("ROLLBACK"));

  // Back to the shape before 004, with every existing row kept, plus rows that use both ends of uint16.
  async function oldShapeWithData() {
    await client.query(await sql("005_add_telemetry_seq.down.sql"));
    await client.query(await sql("004_split_raw_registers.down.sql"));
    assert.ok((await columns(client)).includes("raw_registers"));
    assert.ok(!(await columns(client)).includes("r1"));

    const { rows } = await client.query("INSERT INTO nodes (code) VALUES ('itest-mig') RETURNING id");
    await client.query(
      `INSERT INTO telemetry_records (node_id, raw_registers, battery_voltage)
       VALUES ($1, '{0,0,0,0,0,0,0}', NULL), ($1, '{65535,65535,65535,65535,65535,65535,65535}', 3.3),
              ($1, '{512,268,1200,65,30,12,45}', NULL)`,
      [rows[0].id],
    );
    const before = await client.query(
      "SELECT id, node_id, received_at, measured_at, raw_registers, battery_voltage FROM telemetry_records ORDER BY id",
    );
    return before.rows;
  }

  test("every row keeps its values, nothing is lost, and the array column is gone", async () => {
    const before = await oldShapeWithData();
    assert.ok(before.length >= 3);

    await client.query(await sql("004_split_raw_registers.sql"));
    await client.query(await sql("005_add_telemetry_seq.sql"));

    const cols = await columns(client);
    assert.ok(!cols.includes("raw_registers"));
    for (const c of ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "seq"]) assert.ok(cols.includes(c), c);

    const after = await client.query(
      `SELECT id, node_id, received_at, measured_at, ARRAY[r1, r2, r3, r4, r5, r6, r7] AS raw_registers,
              battery_voltage, seq
       FROM telemetry_records ORDER BY id`,
    );
    assert.equal(after.rows.length, before.length);
    after.rows.forEach((row, i) => {
      const { seq, ...rest } = row;
      assert.deepEqual(rest, before[i], `row id ${row.id}`);
      assert.equal(seq, null);
    });
  });

  test("after 004 the columns are NOT NULL and limited to 0..65535", async () => {
    await oldShapeWithData();
    await client.query(await sql("004_split_raw_registers.sql"));
    const { rows } = await client.query("SELECT id FROM nodes WHERE code = 'itest-mig'");
    for (const [value, code] of [
      [65536, "23514"],
      [-1, "23514"],
      [null, "23502"],
    ]) {
      await client.query("SAVEPOINT bad");
      await assert.rejects(
        client.query(
          "INSERT INTO telemetry_records (node_id, r1, r2, r3, r4, r5, r6, r7) VALUES ($1, 1, 2, 3, 4, 5, 6, $2)",
          [rows[0].id, value],
        ),
        (err) => err.code === code,
      );
      await client.query("ROLLBACK TO SAVEPOINT bad");
    }
  });

  test("a row that would not copy exactly stops the migration and leaves the table unchanged", async () => {
    await oldShapeWithData();
    const { rows } = await client.query("SELECT id FROM nodes WHERE code = 'itest-mig'");
    // Lower bound 0: seven values, so the old CHECK allows it, but raw_registers[1] is not the first one.
    await client.query("INSERT INTO telemetry_records (node_id, raw_registers) VALUES ($1, '[0:6]={1,2,3,4,5,6,7}')", [
      rows[0].id,
    ]);
    const before = await client.query("SELECT id, raw_registers FROM telemetry_records ORDER BY id");

    await client.query("SAVEPOINT migrate");
    await assert.rejects(client.query(await sql("004_split_raw_registers.sql")), /did not copy exactly/);
    await client.query("ROLLBACK TO SAVEPOINT migrate");

    assert.ok((await columns(client)).includes("raw_registers"));
    assert.ok(!(await columns(client)).includes("r1"));
    const after = await client.query("SELECT id, raw_registers FROM telemetry_records ORDER BY id");
    assert.deepEqual(after.rows, before.rows);
  });
});
