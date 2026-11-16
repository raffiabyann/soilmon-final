-- 004: store the seven raw registers as columns r1..r7 instead of one integer[] column.
-- Apply with `npm run migrate`, which wraps this file in a transaction and records it in
-- schema_migrations. Do not add BEGIN/COMMIT here. For a manual psql run, use --single-transaction.
--
-- The sensor always delivers exactly seven registers together, so one column each keeps queries
-- simple (04 DBD-02/DB-02, decision of 2026-11-11). Values stay raw uint16 as read: their meaning
-- is not verified, and conversion will live in one place (a view or function) once it is.
-- The API still accepts and returns rawRegisters as an array; only storage changes.
--
-- Existing rows are copied, then checked. If any row did not copy exactly, the whole migration
-- fails and the table is left as it was.

ALTER TABLE telemetry_records
  ADD COLUMN r1 integer,
  ADD COLUMN r2 integer,
  ADD COLUMN r3 integer,
  ADD COLUMN r4 integer,
  ADD COLUMN r5 integer,
  ADD COLUMN r6 integer,
  ADD COLUMN r7 integer;

UPDATE telemetry_records
SET r1 = raw_registers[1],
    r2 = raw_registers[2],
    r3 = raw_registers[3],
    r4 = raw_registers[4],
    r5 = raw_registers[5],
    r6 = raw_registers[6],
    r7 = raw_registers[7];

DO $$
DECLARE
  mismatched bigint;
BEGIN
  SELECT count(*) INTO mismatched
  FROM telemetry_records
  WHERE raw_registers IS DISTINCT FROM ARRAY[r1, r2, r3, r4, r5, r6, r7];
  IF mismatched > 0 THEN
    RAISE EXCEPTION '004: % row(s) did not copy exactly into r1..r7; nothing was changed', mismatched;
  END IF;
END
$$;

ALTER TABLE telemetry_records
  ALTER COLUMN r1 SET NOT NULL,
  ALTER COLUMN r2 SET NOT NULL,
  ALTER COLUMN r3 SET NOT NULL,
  ALTER COLUMN r4 SET NOT NULL,
  ALTER COLUMN r5 SET NOT NULL,
  ALTER COLUMN r6 SET NOT NULL,
  ALTER COLUMN r7 SET NOT NULL,
  ADD CONSTRAINT telemetry_r1_range CHECK (r1 BETWEEN 0 AND 65535),
  ADD CONSTRAINT telemetry_r2_range CHECK (r2 BETWEEN 0 AND 65535),
  ADD CONSTRAINT telemetry_r3_range CHECK (r3 BETWEEN 0 AND 65535),
  ADD CONSTRAINT telemetry_r4_range CHECK (r4 BETWEEN 0 AND 65535),
  ADD CONSTRAINT telemetry_r5_range CHECK (r5 BETWEEN 0 AND 65535),
  ADD CONSTRAINT telemetry_r6_range CHECK (r6 BETWEEN 0 AND 65535),
  ADD CONSTRAINT telemetry_r7_range CHECK (r7 BETWEEN 0 AND 65535),
  DROP CONSTRAINT telemetry_raw_registers_shape,
  DROP COLUMN raw_registers;
