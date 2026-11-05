import express from "express";
import { healthRouter } from "./routes/health.js";
import { createAuthRouter } from "./routes/auth.js";
import { createTelemetryRouter } from "./routes/telemetry.js";
import { createNodeConfigRouter } from "./routes/nodeConfig.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

export const JSON_BODY_LIMIT = "100kb";

// Stores are null when no database is configured, and jwtSecret is null when JWT_SECRET is not
// set; the routes that need them then respond 503. Missing credentials are still a 401.
export function createApp({
  telemetryStore = null,
  authStore = null,
  nodeConfigStore = null,
  jwtSecret = null,
} = {}) {
  const app = express();
  const auth = createAuthMiddleware({ authStore, jwtSecret });

  app.disable("x-powered-by");
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // /health stays public: it reports only that the process is up.
  app.use("/health", healthRouter);
  app.use("/api/v1", createAuthRouter({ authStore, jwtSecret }));
  app.use("/api/v1", createTelemetryRouter(telemetryStore, auth));
  app.use("/api/v1", createNodeConfigRouter(nodeConfigStore, auth));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
