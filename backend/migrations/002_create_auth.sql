-- 002: dashboard users, their node assignments, and device (producer) credentials.
-- Apply with `npm run migrate`, which wraps this file in a transaction and records it in
-- schema_migrations. Do not add BEGIN/COMMIT here. For a manual psql run, use --single-transaction.
--
-- Implementation decisions, to be recorded in 04/05 (07 OD-08, ODC-13 are still open there):
-- * Users and devices are separate caller classes (05 §11). Users sign in with email and
--   password and receive a JWT; devices send an API key. Neither credential works in place of
--   the other.
-- * password_hash is a bcrypt hash. api_key_hash is the SHA-256 hex digest of a random 32-byte
--   key: the key itself is never stored, and an exact-match lookup on the hash stays possible.
-- * One key per node is a temporary choice until ODC-13 decides producer security; credentials
--   at gateway level are the likely long-term design.

CREATE TABLE IF NOT EXISTS users (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Stored lowercase so that the UNIQUE constraint is also case-insensitive.
  email         text        NOT NULL UNIQUE
                CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  password_hash text        NOT NULL,
  role          text        NOT NULL
                CONSTRAINT users_role_valid CHECK (role IN ('admin', 'viewer')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Which nodes a viewer may read. Admins read every node and need no rows here.
CREATE TABLE IF NOT EXISTS user_nodes (
  user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  node_id bigint NOT NULL REFERENCES nodes (id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, node_id)
);

-- A key is valid while revoked_at is NULL. Rows are kept after revocation as a record.
CREATE TABLE IF NOT EXISTS device_credentials (
  api_key_hash text        PRIMARY KEY
               CONSTRAINT device_credentials_hash_format CHECK (api_key_hash ~ '^[0-9a-f]{64}$'),
  node_id      bigint      NOT NULL REFERENCES nodes (id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

CREATE INDEX IF NOT EXISTS device_credentials_node_idx ON device_credentials (node_id);
