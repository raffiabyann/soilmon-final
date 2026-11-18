// Pure parts of the serial bridge (scripts/bridge.js): argument parsing, reading one gateway
// line, and forwarding one packet. No serial port here, so everything is testable.
import { isValidNodeCode } from "../telemetry/validate.js";

export const LINE_PREFIX = "JSON:";
export const DEFAULT_BAUD = 115200;
export const DEFAULT_URL = "http://127.0.0.1:3000";
export const REQUEST_TIMEOUT_MS = 10_000;
const EXCERPT_LENGTH = 80;

export function parseBridgeArgs(argv) {
  const options = { port: null, baud: DEFAULT_BAUD, url: DEFAULT_URL, list: false };
  const errors = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--list") {
      options.list = true;
    } else if (arg === "--port") {
      if (!value || value.startsWith("--")) errors.push("--port needs a value, for example --port COM5");
      else options.port = value;
      i++;
    } else if (arg === "--baud") {
      const baud = /^[0-9]+$/.test(value ?? "") ? Number(value) : NaN;
      if (!Number.isInteger(baud) || baud < 1) errors.push(`--baud must be a positive integer, got "${value ?? ""}"`);
      else options.baud = baud;
      i++;
    } else if (arg === "--url") {
      let url;
      try {
        url = new URL(value ?? "");
      } catch {
        url = null;
      }
      if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
        errors.push(`--url must be an http or https URL, got "${value ?? ""}"`);
      } else {
        options.url = value.replace(/\/+$/, "");
      }
      i++;
    } else {
      errors.push(`Unknown argument: ${arg}`);
    }
  }
  if (!options.list && options.port === null && errors.length === 0) {
    errors.push("--port is required, for example --port COM5 (use --list to see the ports)");
  }
  return { options, errors };
}

function excerpt(text) {
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
}

// One line from the gateway, without the line break. Returns
//   { kind: "ignore" }                       not a JSON: line (boot messages, ACK/NAK, debug)
//   { kind: "invalid", reason }              a JSON: line that cannot be forwarded
//   { kind: "packet", nodeCode, body }       body is forwarded unchanged; the backend validates it
export function parseSerialLine(line) {
  const text = line.replace(/\r$/, "");
  if (!text.startsWith(LINE_PREFIX)) return { kind: "ignore" };
  const json = text.slice(LINE_PREFIX.length).trim();
  let body;
  try {
    body = JSON.parse(json);
  } catch {
    return { kind: "invalid", reason: `not valid JSON: ${excerpt(json)}` };
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { kind: "invalid", reason: `not a JSON object: ${excerpt(json)}` };
  }
  if (!isValidNodeCode(body.nodeCode)) {
    return { kind: "invalid", reason: `missing or invalid nodeCode: ${excerpt(json)}` };
  }
  return { kind: "packet", nodeCode: body.nodeCode, body };
}

function describeFailure(status, body) {
  const error = body?.error;
  if (!error?.code) return `${status} no JSON error body`;
  const detail = Array.isArray(error.details) && error.details[0];
  const detailText = detail ? `: ${detail.field} ${detail.message}` : "";
  if (status === 401) return `401 ${error.code}: API key rejected, check SIMULATOR_API_KEYS`;
  return `${status} ${error.code}${detailText}`;
}

// POSTs one packet and returns the text to log. Never throws and never includes the API key.
export async function forwardPacket(
  { nodeCode, body },
  { endpoint, apiKeys, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS },
) {
  const key = apiKeys.get(nodeCode);
  if (!key) return `${nodeCode} skipped: no API key for this node in SIMULATOR_API_KEYS`;
  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === "TimeoutError" ? `no answer within ${timeoutMs / 1000} s` : "connection failed";
    return `${nodeCode} backend unreachable (${reason}), packet dropped`;
  }
  const json = await res.json().catch(() => null);
  if (res.status === 201) return `${nodeCode} 201 stored id=${json?.data?.id ?? "?"}`;
  if (res.status === 200 && json?.duplicate) return `${nodeCode} 200 duplicate of id=${json?.data?.id ?? "?"}`;
  return `${nodeCode} ${describeFailure(res.status, json)}`;
}
