// Validation for PATCH /nodes/{node}/config. Only types and the database's own limits are
// checked: domain ranges and the unit of moistureThreshold are TBD (01 FR-14), see
// migrations/003_create_node_config.sql.

const CONFIG_FIELDS = new Set(["moistureThreshold", "pumpDurationSec"]);
// Upper bound of the PostgreSQL integer column, so a large value is a 422 and not a 500.
const PUMP_DURATION_MAX = 2147483647;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Returns { value, errors }. value holds only the fields present in the body; null clears a value.
export function validateConfigPatch(body) {
  if (!isPlainObject(body)) {
    return { value: null, errors: [{ field: "body", message: "must be a JSON object" }] };
  }
  const errors = [];

  for (const key of Object.keys(body)) {
    if (!CONFIG_FIELDS.has(key)) errors.push({ field: key, message: "is not allowed" });
  }

  const value = {};
  const { moistureThreshold, pumpDurationSec } = body;

  if (moistureThreshold !== undefined) {
    // JSON.parse turns numbers such as 1e400 into Infinity, so finiteness is checked explicitly.
    if (moistureThreshold !== null && !(Number.isFinite(moistureThreshold) && moistureThreshold >= 0)) {
      errors.push({
        field: "moistureThreshold",
        message: "must be a finite number greater than or equal to 0, or null",
      });
    } else {
      value.moistureThreshold = moistureThreshold;
    }
  }

  if (pumpDurationSec !== undefined) {
    if (
      pumpDurationSec !== null &&
      !(Number.isInteger(pumpDurationSec) && pumpDurationSec >= 1 && pumpDurationSec <= PUMP_DURATION_MAX)
    ) {
      errors.push({
        field: "pumpDurationSec",
        message: `must be an integer from 1 to ${PUMP_DURATION_MAX}, or null`,
      });
    } else {
      value.pumpDurationSec = pumpDurationSec;
    }
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push({ field: "body", message: "must contain moistureThreshold or pumpDurationSec" });
  }

  return { value: errors.length > 0 ? null : value, errors };
}
