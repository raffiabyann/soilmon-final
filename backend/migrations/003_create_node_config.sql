-- 003: per-node configuration values, editable by admins.
-- Apply with `npm run migrate`, which wraps this file in a transaction and records it in
-- schema_migrations. Do not add BEGIN/COMMIT here. For a manual psql run, use --single-transaction.
--
-- This table only stores values. Nothing reads them to control a pump: decision rules and
-- thresholds are TBD (01 FR-14). moisture_threshold has no confirmed unit, because what the raw
-- registers mean is not verified yet, so only finiteness and sign are checked.
-- A node without a row has no configuration yet; the API reports its values as null.

CREATE TABLE IF NOT EXISTS node_config (
  node_id            bigint           PRIMARY KEY REFERENCES nodes (id) ON DELETE RESTRICT,
  moisture_threshold double precision,
  pump_duration_sec  integer,
  updated_by         bigint           REFERENCES users (id) ON DELETE SET NULL,
  updated_at         timestamptz      NOT NULL DEFAULT now(),
  -- In PostgreSQL NaN sorts above Infinity, so "< 'Infinity'" also rejects NaN.
  CONSTRAINT node_config_moisture_threshold_finite CHECK (
    moisture_threshold IS NULL OR (moisture_threshold >= 0 AND moisture_threshold < 'Infinity')
  ),
  CONSTRAINT node_config_pump_duration_positive CHECK (
    pump_duration_sec IS NULL OR pump_duration_sec >= 1
  )
);
