-- 001: nodes and raw telemetry records.
-- Apply with `npm run migrate`, which wraps this file in a transaction and records it in
-- schema_migrations. Do not add BEGIN/COMMIT here. For a manual psql run, use --single-transaction.
--
-- Provisional implementation decisions (Stage 2), to be reviewed against the data contract:
-- * raw_registers holds the seven Modbus registers 0x0000-0x0006 in their original order, as
--   read (uint16). Their meaning, signedness, scaling and units are not verified, so no
--   converted values are stored.
-- * battery_voltage is the node's reported voltage in volts, as the prototype firmware sends it.
--   Whether power data belongs in the contract is still open (03 ODC-07).
-- * nodes.code format is provisional (03 ODC-03). Unknown nodes are rejected, not created.

CREATE TABLE IF NOT EXISTS nodes (
  id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE
       CONSTRAINT nodes_code_format CHECK (code ~ '^[A-Za-z0-9_-]{1,64}$')
);

CREATE TABLE IF NOT EXISTS telemetry_records (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  node_id         bigint      NOT NULL REFERENCES nodes (id) ON DELETE RESTRICT,
  received_at     timestamptz NOT NULL DEFAULT now(),
  measured_at     timestamptz,
  raw_registers   integer[]   NOT NULL,
  battery_voltage double precision,
  CONSTRAINT telemetry_raw_registers_shape CHECK (
    array_ndims(raw_registers) = 1
    AND cardinality(raw_registers) = 7
    AND array_position(raw_registers, NULL) IS NULL
    AND 0 <= ALL (raw_registers) AND 65535 >= ALL (raw_registers)
  ),
  -- In PostgreSQL NaN sorts above Infinity, so "< 'Infinity'" also rejects NaN.
  CONSTRAINT telemetry_battery_voltage_finite CHECK (
    battery_voltage IS NULL OR (battery_voltage >= 0 AND battery_voltage < 'Infinity')
  )
);

CREATE INDEX IF NOT EXISTS telemetry_records_node_received_idx
  ON telemetry_records (node_id, received_at DESC, id DESC);
