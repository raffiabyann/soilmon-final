// Changes a dashboard user's password. Usage: npm run user:set-password -- --email <email>
// Only users.password_hash changes: role, node assignments and device keys are left alone.
import { ConfigError, loadConfig } from "../src/config/env.js";
import { closePool, getPool } from "../src/db/pool.js";
import { UserCommandError } from "../src/users/manage.js";
import { SET_PASSWORD_USAGE, parseSetPasswordArgs, runUserSetPassword } from "../src/users/cli.js";
import { assertInteractive, promptHidden } from "../src/users/prompt.js";

try {
  const args = parseSetPasswordArgs(process.argv.slice(2));
  if (args.help) {
    console.log(SET_PASSWORD_USAGE);
  } else {
    assertInteractive();
    const config = loadConfig();
    if (!config.databaseUrl) throw new UserCommandError("DATABASE_URL is not set.");
    const client = await getPool(config).connect();
    try {
      await runUserSetPassword({ args, client, readPassword: promptHidden, log: console.log });
    } finally {
      client.release();
    }
  }
} catch (err) {
  const known = err instanceof UserCommandError || err instanceof ConfigError;
  // pg errors carry a SQLSTATE code; neither they nor the message include the connection string.
  console.error(`user:set-password failed: ${known ? err.message : `${err.code ?? ""} ${err.message}`.trim()}`);
  if (err.code === "42P01") console.error("A table is missing: run npm run migrate first.");
  process.exitCode = 1;
} finally {
  await closePool();
}
