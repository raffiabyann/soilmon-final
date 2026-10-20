import { createApp } from "./app.js";
import { ConfigError, loadConfig } from "./config/env.js";
import { closePool } from "./db/pool.js";

let config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`Invalid configuration: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

const server = createApp().listen(config.port, () => {
  console.log(`SoilMon backend listening on port ${config.port} (${config.nodeEnv})`);
});

server.on("error", (err) => {
  console.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  // Force exit if open connections keep the server from closing.
  setTimeout(() => process.exit(1), 10_000).unref();

  server.close(async (err) => {
    try {
      await closePool();
    } catch (poolErr) {
      console.error(`Error closing database pool: ${poolErr.message}`);
      process.exit(1);
    }
    process.exit(err ? 1 : 0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
