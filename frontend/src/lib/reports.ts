import type { MetricKey, TelemetryReading } from "@soilmon/shared";

export interface MetricSummary {
  metricKey: MetricKey;
  min: number;
  avg: number;
  max: number;
  /** Nilai terakhir dibanding rata-rata: naik, turun, atau stabil. */
  trend: "up" | "down" | "flat";
}

/** Metrik yang ditampilkan di Reports (sama dengan yang dikirim semua node). */
export const REPORT_METRICS: readonly MetricKey[] = [
  "soil_temperature",
  "soil_moisture",
  "soil_ph",
  "battery_percent",
  "rssi",
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Hitung min/avg/max per metrik untuk satu node.
 * Nanti di F6 perhitungan ini pindah ke backend: GET /api/v1/telemetry/summary.
 */
export function summarizeNode(readings: TelemetryReading[], nodeCode: string): MetricSummary[] {
  const summaries: MetricSummary[] = [];
  for (const metricKey of REPORT_METRICS) {
    const rows = readings
      .filter((r) => r.nodeCode === nodeCode && r.metricKey === metricKey)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    const latestRow = rows[0];
    if (!latestRow) {
      continue;
    }
    const values = rows.map((r) => r.value);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const diff = latestRow.value - avg;
    const threshold = Math.abs(avg) * 0.02;
    summaries.push({
      metricKey,
      min: Math.min(...values),
      avg: round1(avg),
      max: Math.max(...values),
      trend: diff > threshold ? "up" : diff < -threshold ? "down" : "flat",
    });
  }
  return summaries;
}
