// Error body shape { error: { code, message } } follows the conceptual model in
// 05 API-08. Field names and codes are provisional until 07 OAPI-06 is decided.

// An error whose status, code, message and optional details are meant for the client.
// details lists the request parts that failed, as [{ field, message }] (05 API-08).
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendError(res, status, code, message, details) {
  const error = details ? { code, message, details } : { code, message };
  res.status(status).json({ error });
}

export function notFoundHandler(req, res) {
  sendError(res, 404, "not_found", "Route not found.");
}

// 4xx statuses without an entry here are reported as "client_error".
const CLIENT_ERROR_CODES = {
  400: "bad_request",
  404: "not_found",
  413: "payload_too_large",
  415: "unsupported_media_type",
};

// Express recognises error handlers by their four-argument signature.
export function errorHandler(err, req, res, next) {
  // A started response cannot be replaced. Express's default handler closes the connection.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiError) {
    return sendError(res, err.status, err.code, err.message, err.details);
  }
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "invalid_json", "Request body is not valid JSON.");
  }
  if (err.type === "entity.too.large") {
    return sendError(res, 413, "payload_too_large", "Request body is too large.");
  }

  const status = err.status ?? err.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const code = CLIENT_ERROR_CODES[status] ?? "client_error";
    const message = err.expose ? err.message : "The request could not be processed.";
    return sendError(res, status, code, message);
  }

  // Server errors are logged here and never described to the client.
  console.error(err);
  sendError(res, 500, "internal_error", "Internal server error.");
}
