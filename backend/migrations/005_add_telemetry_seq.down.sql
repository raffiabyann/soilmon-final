-- Rollback for 005. Deletes every stored seq value.
-- The migration runner never executes *.down.sql files. Run manually, after review, only with
-- explicit approval, for example: psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>

ALTER TABLE telemetry_records DROP COLUMN seq;

DELETE FROM schema_migrations WHERE version = '005';
