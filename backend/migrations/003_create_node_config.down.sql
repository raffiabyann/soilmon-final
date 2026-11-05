-- Rollback for 003. DESTRUCTIVE: deletes every node configuration.
-- The migration runner never executes *.down.sql files. Run manually, after review, only with
-- explicit approval, for example: psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>

DROP TABLE IF EXISTS node_config;
DELETE FROM schema_migrations WHERE version = '003';
