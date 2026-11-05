import { Router } from "express";
import { ApiError } from "../middleware/errors.js";
import { requireGranted } from "../auth/access.js";
import { isValidNodeCode } from "../telemetry/validate.js";
import { validateConfigPatch } from "../nodeConfig/validate.js";

// The same resource answers differently by role: any user who may read the node may GET its
// configuration, but only an admin may PATCH it. A viewer's PATCH is a 403 even for its own node.
export function createNodeConfigRouter(store, { requireAuth, requireAdmin }) {
  const router = Router();

  function requireStore() {
    if (!store) {
      throw new ApiError(503, "database_unavailable", "The database is not available.");
    }
    return store;
  }

  function nodeCodeParam(req) {
    const { nodeCode } = req.params;
    if (!isValidNodeCode(nodeCode)) {
      throw new ApiError(404, "not_found", "Node not found.");
    }
    return nodeCode;
  }

  router.get("/nodes/:nodeCode/config", requireAuth, async (req, res) => {
    const nodeCode = nodeCodeParam(req);
    const { config } = requireGranted(await requireStore().getConfig(nodeCode, req.user));
    res.json({ data: config });
  });

  router.patch("/nodes/:nodeCode/config", requireAuth, requireAdmin, async (req, res) => {
    const nodeCode = nodeCodeParam(req);
    const { value, errors } = validateConfigPatch(req.body);
    if (errors.length > 0) {
      throw new ApiError(422, "validation_failed", "The request is not a valid configuration change.", errors);
    }
    const { config } = requireGranted(await requireStore().updateConfig(nodeCode, value, req.user));
    res.json({ data: config });
  });

  return router;
}
