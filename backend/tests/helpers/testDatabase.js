// Safety checks shared by the integration tests. They run only against a dedicated database
// whose name ends with "_test" and that is not the application's DATABASE_URL.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Identifies the database a URL points at, without its credentials.
function target(value) {
  try {
    const parsed = new URL(value);
    return {
      host: parsed.hostname.toLowerCase(),
      port: parsed.port || "5432",
      database: decodeURIComponent(parsed.pathname.slice(1)),
    };
  } catch {
    return null;
  }
}

// npm test does not load .env, so the application's DATABASE_URL is also read from the file.
function applicationDatabaseUrls() {
  const urls = [process.env.DATABASE_URL];
  const envFile = new URL("../../.env", import.meta.url);
  if (existsSync(envFile)) urls.push(parseEnv(readFileSync(envFile, "utf8")).DATABASE_URL);
  return urls.filter(Boolean);
}

// Returns why the tests must not run against TEST_DATABASE_URL, or null when the target is safe.
// Messages name the database only, never the user, password or URL.
export function refusalReason(url) {
  const testDb = target(url);
  if (!testDb) return "TEST_DATABASE_URL is not a valid URL.";
  if (!testDb.database.endsWith("_test")) {
    return `TEST_DATABASE_URL targets database "${testDb.database}"; its name must end with "_test".`;
  }
  for (const appUrl of applicationDatabaseUrls()) {
    const app = target(appUrl);
    if (
      app &&
      app.host === testDb.host &&
      app.port === testDb.port &&
      app.database === testDb.database
    ) {
      return `TEST_DATABASE_URL targets the same database as DATABASE_URL ("${testDb.database}").`;
    }
  }
  return null;
}
