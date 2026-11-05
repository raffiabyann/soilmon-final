import { ApiError } from "./errors.js";
import { ADMIN } from "../auth/roles.js";
import { verifyAccessToken } from "../auth/tokens.js";
import { hashApiKey, isWellFormedApiKey } from "../auth/apiKeys.js";

// Users and devices are separate caller classes (05 §11), each with its own credential and its
// own header. requireAuth reads only Authorization and requireDeviceKey reads only X-API-Key, so
// an API key on a user endpoint, or a user token on the ingestion endpoint, is simply a missing
// credential: 401.
//
// 401: no credential, or one that is malformed, invalid, revoked or expired.
// 403: a valid credential that is not allowed to do this (role or ownership).
// 503: the server cannot check credentials right now (no JWT_SECRET, or no database).

const BEARER = /^Bearer[ ]+([^\s]+)[ ]*$/i;

function unauthenticated(message) {
  return new ApiError(401, "unauthenticated", message);
}

export function createAuthMiddleware({ authStore, jwtSecret }) {
  // Sets req.user = { id, role } from a valid access token. It does not query the database.
  function requireAuth(req, res, next) {
    const match = BEARER.exec(req.get("authorization") ?? "");
    if (!match) {
      // RFC 6750 §3: tells the client which scheme the endpoint expects.
      res.set("WWW-Authenticate", 'Bearer realm="soilmon"');
      throw unauthenticated("A valid access token is required.");
    }
    if (!jwtSecret) {
      throw new ApiError(503, "auth_unavailable", "Authentication is not configured.");
    }
    const user = verifyAccessToken(match[1], jwtSecret);
    if (!user) {
      res.set("WWW-Authenticate", 'Bearer realm="soilmon", error="invalid_token"');
      throw unauthenticated("A valid access token is required.");
    }
    req.user = user;
    next();
  }

  // Sets req.device = { nodeId, nodeCode } for an active device key.
  async function requireDeviceKey(req, res, next) {
    const apiKey = req.get("x-api-key");
    if (apiKey === undefined || apiKey === "") {
      throw unauthenticated("A device API key is required.");
    }
    if (!isWellFormedApiKey(apiKey)) {
      throw unauthenticated("The device API key is not valid.");
    }
    if (!authStore) {
      throw new ApiError(503, "database_unavailable", "The database is not available.");
    }
    const device = await authStore.findActiveDevice(hashApiKey(apiKey));
    if (!device) {
      throw unauthenticated("The device API key is not valid.");
    }
    req.device = device;
    next();
  }

  return { requireAuth, requireAdmin, requireDeviceKey };
}

// Must run after requireAuth. It does not authenticate by itself.
export function requireAdmin(req, res, next) {
  if (!req.user) {
    throw new Error("requireAdmin used without requireAuth before it.");
  }
  if (req.user.role !== ADMIN) {
    throw new ApiError(403, "forbidden", "This action requires the admin role.");
  }
  next();
}
