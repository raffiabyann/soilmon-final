import express from "express";
import { healthRouter } from "./routes/health.js";
import { createTelemetryRouter } from "./routes/telemetry.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

export const JSON_BODY_LIMIT = "100kb";

// telemetryStore is null when no database is configured; telemetry routes then respond 503.
export function createApp({ telemetryStore = null } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use("/health", healthRouter);
  app.use("/api/v1", createTelemetryRouter(telemetryStore));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
