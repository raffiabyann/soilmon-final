// Creates a dashboard user. Usage: npm run user:create -- --email <email> --role <admin|viewer> [--node node-01 ...]
// Needs a migrated database. The password is typed in the terminal and is never printed or stored in plain text.
import { ConfigError, loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { UserCommandError } from "../src/users/manage.js";
import { CREATE_USAGE, parseCreateArgs, runUserCreate } from "../src/users/cli.js";
import { assertInteractive, promptHidden } from "../src/users/prompt.js";

try {
  const args = parseCreateArgs(process.argv.slice(2));
  if (args.help) {
    console.log(CREATE_USAGE);
  } else {
    assertInteractive();
    const config = loadConfig();
    if (!config.databaseUrl) throw new UserCommandError("DATABASE_URL is not set.");
    const client = await getPool(config).connect();
    try {
      await runUserCreate({ args, client, readPassword: promptHidden, log: console.log });
    } finally {
      client.release();
    }
  }
} catch (err) {
  const known = err instanceof UserCommandError || err instanceof ConfigError;
  // pg errors carry a SQLSTATE code; neither they nor the message include the connection string.
  console.error(`user:create failed: ${known ? err.message : `${err.code ?? ""} ${err.message}`.trim()}`);
  if (err.code === "42P01") console.error("A table is missing: run npm run migrate first.");
  process.exitCode = 1;
} finally {
  await closePool();
}
