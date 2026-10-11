import type { MetricKey } from "./metrics";

/**
 * Bentuk data API SoilMon (lihat SoilMon_API_Spec).
 * Nama field camelCase; waktu selalu string ISO 8601 UTC berakhiran "Z".
 * Frontend dan backend wajib memakai tipe dari file ini.
 */

/** Waktu dalam format ISO 8601 UTC, contoh "2026-10-14T03:15:00Z". */
export type IsoDateTime = string;

export type UserRole = "owner" | "technician";

export interface Gateway {
  code: string;
  name: string;
  lastSeenAt: IsoDateTime | null;
}

export interface Metric {
  key: MetricKey;
  label: string;
  unit: string | null;
  normalMin: number | null;
  normalMax: number | null;
}

export interface NodeSummary {
  code: string;
  name: string;
  gatewayCode: string;
  pumpFlowMlPerS: number | null;
  lastSeenAt: IsoDateTime | null;
  /** Nilai terbaru per metric; metric yang belum pernah dikirim tidak ada. */
  latest: Partial<Record<MetricKey, number>>;
}

export interface TelemetryReading {
  nodeCode: string;
  metricKey: MetricKey;
  value: number;
  recordedAt: IsoDateTime;
}

export type AlertType = "below_min" | "above_max";

export interface Alert {
  id: number;
  nodeCode: string;
  metricKey: MetricKey;
  type: AlertType;
  value: number;
  triggeredAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  acknowledgedBy: string | null;
  acknowledgedAt: IsoDateTime | null;
}

export type IrrigationTrigger = "auto" | "manual";

export interface IrrigationEvent {
  id: number;
  nodeCode: string;
  startedAt: IsoDateTime;
  durationSeconds: number;
  volumeLiters: number;
  triggerType: IrrigationTrigger;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
