/**
 * Klien kecil untuk REST API backend (05 §6–7). Semua permintaan lewat proxy Vite: /api → backend.
 * Nilai register adalah data mentah: arti, signedness, skala, dan satuannya belum diverifikasi,
 * jadi klien ini tidak mengonversinya.
 */

/** Node yang ditampilkan di baris "Data masuk" Dashboard. */
export const TELEMETRY_NODE_CODE = "node-01";

/** Satu record telemetry seperti dikirim backend. */
export interface TelemetryRecord {
  id: string;
  nodeCode: string;
  /** Waktu server menerima record (ISO 8601 UTC). Selalu ada. */
  receivedAt: string;
  /** Waktu pengukuran dari pengirim, kalau dikirim. */
  measuredAt: string | null;
  /** Tujuh register Modbus 0x0000–0x0006, urutan asli, uint16 mentah. */
  rawRegisters: number[];
  batteryVoltage: number | null;
}

/** Kegagalan permintaan API. status 0 berarti tidak ada respons HTTP sama sekali. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Bentuk error backend: { error: { code, message } }. */
function readApiError(body: unknown): { code: string; message: string } | null {
  if (!isObject(body) || !isObject(body.error)) return null;
  const { code, message } = body.error;
  return typeof code === "string" && typeof message === "string" ? { code, message } : null;
}

function isTelemetryRecord(value: unknown): value is TelemetryRecord {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.nodeCode === "string" &&
    typeof value.receivedAt === "string" &&
    (value.measuredAt === null || typeof value.measuredAt === "string") &&
    Array.isArray(value.rawRegisters) &&
    value.rawRegisters.every((r) => typeof r === "number") &&
    (value.batteryVoltage === null || typeof value.batteryVoltage === "number")
  );
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { accept: "application/json" }, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, "network_error", "Tidak ada respons dari server.");
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    // Bukan JSON: misalnya proxy Vite yang menjawab sendiri karena backend mati.
  }

  if (!response.ok) {
    const apiError = readApiError(body);
    if (apiError) throw new ApiError(response.status, apiError.code, apiError.message);
    const code = response.status >= 500 ? "backend_unreachable" : "http_error";
    throw new ApiError(response.status, code, `Permintaan gagal (HTTP ${response.status}).`);
  }
  return body;
}

/** Riwayat telemetry satu node, terbaru dulu (GET /api/v1/nodes/{nodeCode}/telemetry). */
export async function fetchNodeTelemetry(
  nodeCode: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<TelemetryRecord[]> {
  const query = options.limit === undefined ? "" : `?limit=${options.limit}`;
  const body = await getJson(
    `/api/v1/nodes/${encodeURIComponent(nodeCode)}/telemetry${query}`,
    options.signal,
  );
  if (!isObject(body) || !Array.isArray(body.data) || !body.data.every(isTelemetryRecord)) {
    throw new ApiError(200, "invalid_response", "Respons API tidak sesuai format telemetry.");
  }
  return body.data;
}

/** Penjelasan error untuk pengguna, dalam bahasa Indonesia. Tidak pernah memuat detail server. */
export function describeApiError(error: ApiError, nodeCode: string): string {
  switch (error.code) {
    case "network_error":
    case "backend_unreachable":
      return "Backend tidak dapat dihubungi. Pastikan backend berjalan di port 3000.";
    case "database_unavailable":
      return "Backend berjalan, tetapi database PostgreSQL tidak tersedia.";
    case "not_found":
      return `Node ${nodeCode} belum terdaftar di database.`;
    case "validation_failed":
      return "Parameter permintaan ditolak backend.";
    case "invalid_response":
      return "Respons backend tidak sesuai format yang diharapkan.";
    default:
      return error.message;
  }
}
