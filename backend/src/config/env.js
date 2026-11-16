import { isIP } from "node:net";

const NODE_ENVS =["development", "test", "production"];

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

// Loopback by default, so a server started without HOST is not reachable from the network.
export const DEFAULT_HOST = "127.0.0.1";

const HOSTNAME = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

function parseHost(value) {
  if (value === undefined || value === "") return DEFAULT_HOST;
  if (isIP(value) === 0 && !HOSTNAME.test(value)) {
    throw new ConfigError(`HOST must be an IP address or a hostname, got "${value}".`);
  }
  return value;
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

// HS256 needs a key at least as long as its 256-bit output to keep its strength (RFC 7518 §3.2).
export const JWT_SECRET_MIN_LENGTH = 32;

function parseJwtSecret(value) {
  if (value === undefined || value === "") return null;
  if (value.length < JWT_SECRET_MIN_LENGTH) {
    // The value is not echoed back because it is a secret.
    throw new ConfigError(`JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long.`);
  }
  return value;
}

export function loadConfig(env = process.env) {
  return Object.freeze({
    host: parseHost(env.HOST),
    port: parsePort(env.PORT),
    nodeEnv: parseNodeEnv(env.NODE_ENV),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
    jwtSecret: parseJwtSecret(env.JWT_SECRET),
  });
}
