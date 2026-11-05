-- Rollback for 002. DESTRUCTIVE: deletes every user, node assignment and device credential.
-- Roll back 003 first: node_config.updated_by references users.
-- The migration runner never executes *.down.sql files. Run manually, after review, only with
-- explicit approval, for example: psql --single-transaction -v ON_ERROR_STOP=1 -f <this file>

DROP TABLE IF EXISTS device_credentials;
DROP TABLE IF EXISTS user_nodes;
DROP TABLE IF EXISTS users;
DELETE FROM schema_migrations WHERE version = '002';
