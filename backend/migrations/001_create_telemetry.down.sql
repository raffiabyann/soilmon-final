-- Rollback for 001. DESTRUCTIVE: deletes every node and telemetry record.
-- The migration runner never executes *.down.sql files. Run manually, after review, only with
-- explicit approval, for example: psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>

DROP TABLE IF EXISTS telemetry_records;
DROP TABLE IF EXISTS nodes;
DELETE FROM schema_migrations WHERE version = '001';
