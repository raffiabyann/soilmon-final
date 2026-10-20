// Validation for the provisional Stage 2 telemetry contract. Field names follow 05 OAPI-01 only
// provisionally; see migrations/001_create_telemetry.sql for the storage decisions.

export const RAW_REGISTER_COUNT = 7;
export const RAW_REGISTER_MAX = 65535;
export const HISTORY_DEFAULT_LIMIT = 50;
export const HISTORY_MAX_LIMIT = 500;

const NODE_CODE = /^[A-Za-z0-9_-]{1,64}$/;
// RFC 3339 date-time with an explicit "Z" or numeric offset. Local times without a zone are
// ambiguous and rejected.
const TIMESTAMP =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d{1,9})?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

const TELEMETRY_FIELDS = new Set(["nodeCode", "rawRegisters", "batteryVoltage", "measuredAt"]);
const HISTORY_PARAMS = new Set(["limit", "from", "to"]);

export function isValidNodeCode(value) {
  return typeof value === "string" && NODE_CODE.test(value);
}

// Returns a Date, or null when the value is not a valid RFC 3339 timestamp.
export function parseTimestamp(value) {
  if (typeof value !== "string") return null;
  const match = TIMESTAMP.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  // Reject dates such as 2026-02-30 that Date would roll over into the next month.
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Returns { value, errors }. value is only meaningful when errors is empty.
export function validateTelemetryInput(body) {
  if (!isPlainObject(body)) {
    return { value: null, errors: [{ field: "body", message: "must be a JSON object" }] };
  }
  const errors = [];

  for (const key of Object.keys(body)) {
    if (!TELEMETRY_FIELDS.has(key)) errors.push({ field: key, message: "is not allowed" });
  }

  const { nodeCode, rawRegisters, batteryVoltage, measuredAt } = body;

  if (nodeCode === undefined) {
    errors.push({ field: "nodeCode", message: "is required" });
  } else if (!isValidNodeCode(nodeCode)) {
    errors.push({
      field: "nodeCode",
      message: "must be a string of 1-64 letters, digits, '_' or '-'",
    });
  }

  if (rawRegisters === undefined) {
    errors.push({ field: "rawRegisters", message: "is required" });
  } else if (!Array.isArray(rawRegisters) || rawRegisters.length !== RAW_REGISTER_COUNT) {
    errors.push({
      field: "rawRegisters",
      message: `must be an array of exactly ${RAW_REGISTER_COUNT} values`,
    });
  } else {
    rawRegisters.forEach((register, index) => {
      if (!Number.isInteger(register) || register < 0 || register > RAW_REGISTER_MAX) {
        errors.push({
          field: `rawRegisters[${index}]`,
          message: `must be an integer from 0 to ${RAW_REGISTER_MAX}`,
        });
      }
    });
  }

  // JSON.parse turns numbers such as 1e400 into Infinity, so finiteness is checked explicitly.
  if (
    batteryVoltage !== undefined &&
    batteryVoltage !== null &&
    !(Number.isFinite(batteryVoltage) && batteryVoltage >= 0)
  ) {
    errors.push({
      field: "batteryVoltage",
      message: "must be a finite number greater than or equal to 0, or null",
    });
  }

  let measuredDate = null;
  if (measuredAt !== undefined && measuredAt !== null) {
    measuredDate = parseTimestamp(measuredAt);
    if (!measuredDate) {
      errors.push({
        field: "measuredAt",
        message: "must be an RFC 3339 timestamp with a time zone, or null",
      });
    }
  }

  if (errors.length > 0) return { value: null, errors };
  return {
    value: {
      nodeCode,
      rawRegisters: [...rawRegisters],
      batteryVoltage: batteryVoltage ?? null,
      measuredAt: measuredDate,
    },
    errors,
  };
}

// Validates the history query string. Returns { value: { limit, from, to }, errors }.
export function validateHistoryQuery(query) {
  const errors = [];
  for (const key of Object.keys(query)) {
    if (!HISTORY_PARAMS.has(key)) errors.push({ field: key, message: "is not a supported parameter" });
  }

  const single = (name) => {
    const value = query[name];
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
      errors.push({ field: name, message: "must be given once" });
      return undefined;
    }
    return value;
  };

  let limit = HISTORY_DEFAULT_LIMIT;
  const rawLimit = single("limit");
  if (rawLimit !== undefined) {
    const parsed = /^[0-9]+$/.test(rawLimit) ? Number(rawLimit) : NaN;
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > HISTORY_MAX_LIMIT) {
      errors.push({ field: "limit", message: `must be an integer from 1 to ${HISTORY_MAX_LIMIT}` });
    } else {
      limit = parsed;
    }
  }

  const bound = (name) => {
    const raw = single(name);
    if (raw === undefined) return null;
    const date = parseTimestamp(raw);
    if (!date) errors.push({ field: name, message: "must be an RFC 3339 timestamp with a time zone" });
    return date;
  };
  const from = bound("from");
  const to = bound("to");
  if (from && to && from >= to) {
    errors.push({ field: "from", message: "must be earlier than to" });
  }

  return { value: errors.length > 0 ? null : { limit, from, to }, errors };
}
