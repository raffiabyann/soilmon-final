import { endSession, getAccessToken, isAuthRole, saveSession, type AuthRole } from "./auth";

/**
 * Klien kecil untuk REST API backend (05 §6–7). Semua permintaan lewat proxy Vite: /api → backend.
 * Nilai register adalah data mentah: arti, signedness, skala, dan satuannya belum diverifikasi,
 * jadi klien ini tidak mengonversinya.
 *
 * Setiap permintaan (kecuali login) membawa Authorization: Bearer. Kalau backend menjawab 401,
 * sesi dihapus di sini dan RequireAuth mengarahkan pengguna ke halaman login.
 */

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

/** Satu field yang ditolak backend (error.details). */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

/** Kegagalan permintaan API. status 0 berarti tidak ada respons HTTP sama sekali. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorDetail(value: unknown): value is ApiErrorDetail {
  return isObject(value) && typeof value.field === "string" && typeof value.message === "string";
}

/** Bentuk error backend: { error: { code, message, details? } }. */
function readApiError(
  body: unknown,
): { code: string; message: string; details: ApiErrorDetail[] } | null {
  if (!isObject(body) || !isObject(body.error)) return null;
  const { code, message, details } = body.error;
  if (typeof code !== "string" || typeof message !== "string") return null;
  return { code, message, details: Array.isArray(details) ? details.filter(isApiErrorDetail) : [] };
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

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** false hanya untuk login: belum ada token, dan 401-nya berarti "email atau password salah". */
  authenticated?: boolean;
}

async function request(
  method: string,
  path: string,
  { body: payload, signal, authenticated = true }: RequestOptions = {},
): Promise<unknown> {
  const token = authenticated ? getAccessToken() : null;
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (payload !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal,
    });
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
    // Hanya jika token yang ditolak masih token yang sedang dipakai: jawaban 401 yang terlambat
    // untuk token lama tidak boleh mengeluarkan pengguna yang baru saja masuk lagi.
    if (response.status === 401 && token !== null && token === getAccessToken()) {
      endSession("expired");
    }
    const apiError = readApiError(body);
    if (apiError) {
      throw new ApiError(response.status, apiError.code, apiError.message, apiError.details);
    }
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
  const body = await request(
    "GET",
    `/api/v1/nodes/${encodeURIComponent(nodeCode)}/telemetry${query}`,
    { signal: options.signal },
  );
  if (!isObject(body) || !Array.isArray(body.data) || !body.data.every(isTelemetryRecord)) {
    throw new ApiError(200, "invalid_response", "Respons API tidak sesuai format telemetry.");
  }
  return body.data;
}

/** Node terdaftar seperti dikirim backend. */
export interface ApiNode {
  code: string;
  /** Waktu record terakhir node diterima server, null kalau belum pernah mengirim. */
  lastReceivedAt: string | null;
}

function isApiNode(value: unknown): value is ApiNode {
  return (
    isObject(value) &&
    typeof value.code === "string" &&
    (value.lastReceivedAt === null || typeof value.lastReceivedAt === "string")
  );
}

/** Semua node terdaftar, urut kode (GET /api/v1/nodes). */
export async function fetchNodes(signal?: AbortSignal): Promise<ApiNode[]> {
  const body = await request("GET", "/api/v1/nodes", { signal });
  if (!isObject(body) || !Array.isArray(body.data) || !body.data.every(isApiNode)) {
    throw new ApiError(200, "invalid_response", "Respons API tidak sesuai format daftar node.");
  }
  return body.data;
}

/** Pengguna yang sedang masuk, seperti dikirim POST /api/v1/auth/login. */
export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
}

/** Masuk dengan email dan password; kalau berhasil, sesi disimpan dan dikembalikan. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const body = await request("POST", "/api/v1/auth/login", {
    body: { email, password },
    authenticated: false,
  });
  const data = isObject(body) ? body.data : null;
  const user = isObject(data) ? data.user : null;
  if (
    !isObject(data) ||
    typeof data.accessToken !== "string" ||
    !isObject(user) ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    !isAuthRole(user.role)
  ) {
    throw new ApiError(200, "invalid_response", "Respons API tidak sesuai format login.");
  }
  saveSession({ accessToken: data.accessToken, email: user.email, role: user.role });
  return { id: user.id, email: user.email, role: user.role };
}

/** Konfigurasi satu node (GET/PATCH /api/v1/nodes/{nodeCode}/config). null = belum diatur. */
export interface NodeConfig {
  nodeCode: string;
  /** Satuannya belum ditetapkan (arti register belum diverifikasi). */
  moistureThreshold: number | null;
  pumpDurationSec: number | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

/** Field yang dikirim ke PATCH; field yang tidak ada tidak diubah, null mengosongkan nilainya. */
export type NodeConfigChanges = Partial<Pick<NodeConfig, "moistureThreshold" | "pumpDurationSec">>;

function isNodeConfig(value: unknown): value is NodeConfig {
  return (
    isObject(value) &&
    typeof value.nodeCode === "string" &&
    (value.moistureThreshold === null || typeof value.moistureThreshold === "number") &&
    (value.pumpDurationSec === null || typeof value.pumpDurationSec === "number") &&
    (value.updatedBy === null || typeof value.updatedBy === "string") &&
    (value.updatedAt === null || typeof value.updatedAt === "string")
  );
}

function readNodeConfig(body: unknown): NodeConfig {
  if (!isObject(body) || !isNodeConfig(body.data)) {
    throw new ApiError(200, "invalid_response", "Respons API tidak sesuai format konfigurasi.");
  }
  return body.data;
}

/** Konfigurasi node. Admin dan viewer pemilik node boleh membaca. */
export async function fetchNodeConfig(nodeCode: string, signal?: AbortSignal): Promise<NodeConfig> {
  const path = `/api/v1/nodes/${encodeURIComponent(nodeCode)}/config`;
  return readNodeConfig(await request("GET", path, { signal }));
}

/** Ubah konfigurasi node. Hanya admin yang diterima backend; viewer mendapat 403. */
export async function patchNodeConfig(
  nodeCode: string,
  changes: NodeConfigChanges,
): Promise<NodeConfig> {
  const path = `/api/v1/nodes/${encodeURIComponent(nodeCode)}/config`;
  return readNodeConfig(await request("PATCH", path, { body: changes }));
}

/** Rincian per field dari error.details, satu string per field (kosong kalau tidak ada). */
export function describeErrorDetails(error: ApiError): string[] {
  return error.details.map((d) => `${d.field}: ${d.message}`);
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
    case "auth_unavailable":
      return "Backend belum dikonfigurasi untuk login. Isi JWT_SECRET di backend/.env, lalu jalankan ulang backend.";
    case "validation_failed":
      return "Parameter permintaan ditolak backend.";
    case "invalid_response":
      return "Respons backend tidak sesuai format yang diharapkan.";
    default:
      return error.message;
  }
}
