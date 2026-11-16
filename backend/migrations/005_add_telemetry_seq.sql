-- 005: the node's packet counter, used to drop repeated deliveries.
-- Apply with `npm run migrate`, which wraps this file in a transaction and records it in
-- schema_migrations. Do not add BEGIN/COMMIT here. For a manual psql run, use --single-transaction.
--
-- seq is optional and 16-bit. It restarts at 0 when a node reboots, so it is not unique: the API
-- treats the same node and seq within 10 minutes as a duplicate (05 §6.1, decision of 2026-11-11).
-- The existing (node_id, received_at) index serves that lookup.

ALTER TABLE telemetry_records
  ADD COLUMN seq integer,
  ADD CONSTRAINT telemetry_seq_range CHECK (seq BETWEEN 0 AND 65535);
