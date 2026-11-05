import { Router } from "express";
import { ApiError } from "../middleware/errors.js";
import { requireGranted } from "../auth/access.js";
import {
  isValidNodeCode,
  validateHistoryQuery,
  validateTelemetryInput,
} from "../telemetry/validate.js";

// Ingestion accepts only device keys; every read needs a signed-in user and is limited to the
// nodes that user may read. The middleware comes from createAuthMiddleware.
export function createTelemetryRouter(store, { requireAuth, requireDeviceKey }) {
  const router = Router();

  function requireStore() {
    if (!store) {
      throw new ApiError(503, "database_unavailable", "The database is not available.");
    }
    return store;
  }

  router.post("/telemetry", requireDeviceKey, async (req, res) => {
    const { value, errors } = validateTelemetryInput(req.body);
    if (errors.length > 0) {
      throw new ApiError(
        422,
        "validation_failed",
        "The request does not match the telemetry contract.",
        errors,
      );
    }

    // A key belongs to one node and may only send that node's data.
    if (value.nodeCode !== req.device.nodeCode) {
      throw new ApiError(403, "node_mismatch", "This API key may not send data for this node.", [
        { field: "nodeCode", message: "does not match the node of the API key" },
      ]);
    }

    const record = await requireStore().insertRecord(value);
    if (!record) {
      throw new ApiError(422, "unknown_node", "The node is not registered.", [
        { field: "nodeCode", message: "is not a registered node" },
      ]);
    }
    res.status(201).json({ data: record });
  });

  router.get("/nodes", requireAuth, async (req, res) => {
    res.json({ data: await requireStore().listNodes(req.user) });
  });

  router.get("/nodes/:nodeCode", requireAuth, async (req, res) => {
    const { nodeCode } = req.params;
    if (!isValidNodeCode(nodeCode)) {
      throw new ApiError(404, "not_found", "Node not found.");
    }
    const { node } = requireGranted(await requireStore().getNode(nodeCode, req.user));
    res.json({ data: node });
  });

  router.get("/nodes/:nodeCode/telemetry", requireAuth, async (req, res) => {
    const { nodeCode } = req.params;
    // A code that could never be registered cannot name an existing node.
    if (!isValidNodeCode(nodeCode)) {
      throw new ApiError(404, "not_found", "Node not found.");
    }

    const { value, errors } = validateHistoryQuery(req.query);
    if (errors.length > 0) {
      throw new ApiError(422, "validation_failed", "The query parameters are not valid.", errors);
    }

    const { records } = requireGranted(await requireStore().listRecords(nodeCode, value, req.user));
    res.json({ data: records });
  });

  return router;
}
