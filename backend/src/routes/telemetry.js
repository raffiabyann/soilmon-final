import { Router } from "express";
import { ApiError } from "../middleware/errors.js";
import {
  isValidNodeCode,
  validateHistoryQuery,
  validateTelemetryInput,
} from "../telemetry/validate.js";

// No authentication or authorisation: for local development only (05 OAPI-08 is open).
export function createTelemetryRouter(store) {
  const router = Router();

  function requireStore() {
    if (!store) {
      throw new ApiError(503, "database_unavailable", "The database is not available.");
    }
    return store;
  }

  router.post("/telemetry", async (req, res) => {
    const { value, errors } = validateTelemetryInput(req.body);
    if (errors.length > 0) {
      throw new ApiError(
        422,
        "validation_failed",
        "The request does not match the telemetry contract.",
        errors,
      );
    }

    const record = await requireStore().insertRecord(value);
    if (!record) {
      throw new ApiError(422, "unknown_node", "The node is not registered.", [
        { field: "nodeCode", message: "is not a registered node" },
      ]);
    }
    res.status(201).json({ data: record });
  });

  router.get("/nodes/:nodeCode/telemetry", async (req, res) => {
    const { nodeCode } = req.params;
    // A code that could never be registered cannot name an existing node.
    if (!isValidNodeCode(nodeCode)) {
      throw new ApiError(404, "not_found", "Node not found.");
    }

    const { value, errors } = validateHistoryQuery(req.query);
    if (errors.length > 0) {
      throw new ApiError(422, "validation_failed", "The query parameters are not valid.", errors);
    }

    const records = await requireStore().listRecords(nodeCode, value);
    if (!records) {
      throw new ApiError(404, "not_found", "Node not found.");
    }
    res.json({ data: records });
  });

  return router;
}
