// Creates demo users, node assignments and device keys. Usage: npm run seed
// Needs a migrated database (npm run migrate). Every run sets new passwords and keys and prints
// them once: they are not stored anywhere in plain text, so save the output for the demo.
//
//   viewer A -> node-01        viewer B -> node-02        admin -> every node
//
// Two viewers with different nodes are what makes authorisation demonstrable: each must be
// refused the other's node.
import { randomBytes } from "node:crypto";
import { ConfigError, loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { hashPassword } from "../src/auth/passwords.js";
import { generateApiKey, hashApiKey } from "../src/auth/apiKeys.js";

const NODES = ["node-01", "node-02"];
const USERS = [
  { email: "viewer-a@soilmon.local", role: "viewer", nodes: ["node-01"] },
  { email: "viewer-b@soilmon.local", role: "viewer", nodes: ["node-02"] },
  { email: "admin@soilmon.local", role: "admin", nodes: [] },
];

class SeedError extends Error {}

function generatePassword() {
  return randomBytes(12).toString("base64url");
}

async function seed(client) {
  for (const code of NODES) {
    await client.query("INSERT INTO nodes (code) VALUES ($1) ON CONFLICT (code) DO NOTHING", [code]);
  }

  const credentials = [];
  for (const user of USERS) {
    const password = generatePassword();
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
       RETURNING id`,
      [user.email, await hashPassword(password), user.role],
    );
    const userId = rows[0].id;
    // Replaces the assignments, so a re-run cannot leave a viewer with an extra node.
    await client.query("DELETE FROM user_nodes WHERE user_id = $1", [userId]);
    for (const code of user.nodes) {
      await client.query(
        "INSERT INTO user_nodes (user_id, node_id) SELECT $1, id FROM nodes WHERE code = $2",
        [userId, code],
      );
    }
    credentials.push({ ...user, password });
  }

  const keys = [];
  for (const code of NODES) {
    // Earlier keys for this node stop working; their rows are kept as a record.
    await client.query(
      `UPDATE device_credentials SET revoked_at = now()
       WHERE revoked_at IS NULL AND node_id = (SELECT id FROM nodes WHERE code = $1)`,
      [code],
    );
    const apiKey = generateApiKey();
    await client.query(
      "INSERT INTO device_credentials (api_key_hash, node_id) SELECT $1, id FROM nodes WHERE code = $2",
      [hashApiKey(apiKey), code],
    );
    keys.push({ code, apiKey });
  }

  return { credentials, keys };
}

async function main() {
  const config = loadConfig();
  if (config.nodeEnv === "production") {
    throw new SeedError("Refusing to seed demo accounts with NODE_ENV=production.");
  }
  if (!config.databaseUrl) {
    throw new SeedError("DATABASE_URL is not set.");
  }

  const client = await getPool(config).connect();
  let result;
  try {
    await client.query("BEGIN");
    result = await seed(client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  console.log("Seeded. These values are shown only now.\n");
  console.log("Users (POST /api/v1/auth/login):");
  for (const { email, password, role, nodes } of result.credentials) {
    const access = role === "admin" ? "every node" : nodes.join(", ");
    console.log(`  ${role.padEnd(6)}  ${email.padEnd(24)}  password: ${password}  (${access})`);
  }
  console.log("\nDevice keys (header X-API-Key on POST /api/v1/telemetry):");
  for (const { code, apiKey } of result.keys) console.log(`  ${code}  ${apiKey}`);
  console.log("\nFor the simulator (.env or shell):");
  console.log(`  SIMULATOR_API_KEYS=${result.keys.map(({ code, apiKey }) => `${code}:${apiKey}`).join(",")}`);
}

try {
  await main();
} catch (err) {
  const known = err instanceof SeedError || err instanceof ConfigError;
  // pg errors carry a SQLSTATE code; neither they nor the message include the connection string.
  console.error(`Seed failed: ${known ? err.message : `${err.code ?? ""} ${err.message}`.trim()}`);
  if (err.code === "42P01") console.error("A table is missing: run npm run migrate first.");
  process.exitCode = 1;
} finally {
  await closePool();
}
