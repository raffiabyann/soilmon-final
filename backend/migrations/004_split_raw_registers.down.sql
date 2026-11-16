-- Rollback for 004: back to one raw_registers integer[] column. No data is lost.
-- Roll back 005 first, or the runner will refuse 004 as older than the latest applied migration.
-- The migration runner never executes *.down.sql files. Run manually, after review, only with
-- explicit approval, for example: psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>

ALTER TABLE telemetry_records ADD COLUMN raw_registers integer[];

UPDATE telemetry_records SET raw_registers = ARRAY[r1, r2, r3, r4, r5, r6, r7];

ALTER TABLE telemetry_records
  ALTER COLUMN raw_registers SET NOT NULL,
  ADD CONSTRAINT telemetry_raw_registers_shape CHECK (
    array_ndims(raw_registers) = 1
    AND cardinality(raw_registers) = 7
    AND array_position(raw_registers, NULL) IS NULL
    AND 0 <= ALL (raw_registers) AND 65535 >= ALL (raw_registers)
  ),
  DROP COLUMN r1,
  DROP COLUMN r2,
  DROP COLUMN r3,
  DROP COLUMN r4,
  DROP COLUMN r5,
  DROP COLUMN r6,
  DROP COLUMN r7;

DELETE FROM schema_migrations WHERE version = '004';
