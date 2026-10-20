import express from "express";
import { healthRouter } from "./routes/health.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

export const JSON_BODY_LIMIT = "100kb";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
