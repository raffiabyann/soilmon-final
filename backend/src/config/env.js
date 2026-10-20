const NODE_ENVS = ["development", "test", "production"];

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

function parsePort(value) {
  if (value === undefined || value === "") return 3000;
  // Number() alone would also accept "0x10", "1e3", "0b11" and surrounding whitespace.
  const port = /^[0-9]+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`PORT must be a decimal integer between 1 and 65535, got "${value}".`);
  }
  return port;
}

function parseNodeEnv(value) {
  if (value === undefined || value === "") return "development";
  if (!NODE_ENVS.includes(value)) {
    throw new ConfigError(`NODE_ENV must be one of ${NODE_ENVS.join(", ")}, got "${value}".`);
  }
  return value;
}

function parseDatabaseUrl(value) {
  if (value === undefined || value === "") return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    // The value is not echoed back because it may contain a password.
    throw new ConfigError("DATABASE_URL is not a valid URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new ConfigError("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
  }
  return value;
}

export function loadConfig(env = process.env) {
  return Object.freeze({
    port: parsePort(env.PORT),
    nodeEnv: parseNodeEnv(env.NODE_ENV),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
  });
}
