import {
  getMetricStatus,
  type IrrigationEvent,
  type MetricKey,
  type TelemetryReading,
} from "@soilmon/shared";
import { getMetric } from "./metrics";
import { dateKeyWib, formatWeekdayWib } from "./time";

/** Metrik yang ditampilkan di Reports, urut seperti di Figma. */
export const REPORT_METRICS: readonly MetricKey[] = [
  "soil_moisture",
  "soil_temperature",
  "soil_ph",
  "battery_percent",
  "rssi",
];

/** Metrik yang punya batas normal, dipakai heatmap kepatuhan. */
export const HEATMAP_METRICS: readonly MetricKey[] = [
  "soil_moisture",
  "soil_temperature",
  "soil_ph",
  "battery_percent",
];

/**
 * Status ringkasan, dari nilai terakhir dan rata-rata:
 * - ok: nilai terakhir normal;
 * - warning: nilai terakhir di luar batas tapi rata-rata masih normal (baru mulai);
 * - danger: rata-rata pun di luar batas (bermasalah sepanjang periode);
 * - none: metrik tanpa batas normal (misalnya sinyal).
 */
export type SummaryStatus = "ok" | "warning" | "danger" | "none";

export interface MetricSummary {
  metricKey: MetricKey;
  min: number;
  avg: number;
  max: number;
  first: number;
  latest: number;
  status: SummaryStatus;
  /** "low" atau "high" kalau statusnya warning/danger. */
  direction: "low" | "high" | null;
}

export interface NodeReport {
  nodeCode: string;
  metrics: MetricSummary[];
  packetCount: number;
  /** Persen bacaan (metrik berbatas normal) yang masuk batas normal. */
  inRangePercent: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function summarize(rows: TelemetryReading[], metricKey: MetricKey): MetricSummary | null {
  const sorted = [...rows].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const firstRow = sorted[0];
  const lastRow = sorted[sorted.length - 1];
  if (!firstRow || !lastRow) return null;
  const values = sorted.map((r) => r.value);
  const avg = round1(values.reduce((s, v) => s + v, 0) / values.length);
  const metric = getMetric(metricKey);
  let status: SummaryStatus = "none";
  let direction: MetricSummary["direction"] = null;
  if (metric && (metric.normalMin !== null || metric.normalMax !== null)) {
    const latestStatus = getMetricStatus(lastRow.value, metric);
    const avgStatus = getMetricStatus(avg, metric);
    if (latestStatus === "ok" || latestStatus === "unknown") {
      status = "ok";
    } else {
      direction = latestStatus;
      status = avgStatus === latestStatus ? "danger" : "warning";
    }
  }
  return {
    metricKey,
    min: Math.min(...values),
    avg,
    max: Math.max(...values),
    first: firstRow.value,
    latest: lastRow.value,
    status,
    direction,
  };
}

/**
 * Ringkasan satu node untuk periode `readings` yang sudah difilter.
 * Nanti (F6) min/avg/max diambil dari backend: GET /api/v1/telemetry/summary.
 */
export function buildNodeReport(readings: TelemetryReading[], nodeCode: string): NodeReport {
  const own = readings.filter((r) => r.nodeCode === nodeCode);
  const metrics = REPORT_METRICS.flatMap((key) => {
    const s = summarize(
      own.filter((r) => r.metricKey === key),
      key,
    );
    return s ? [s] : [];
  });
  let checked = 0;
  let inRange = 0;
  for (const r of own) {
    const metric = getMetric(r.metricKey);
    if (!metric || (metric.normalMin === null && metric.normalMax === null)) continue;
    checked += 1;
    if (getMetricStatus(r.value, metric) === "ok") inRange += 1;
  }
  return {
    nodeCode,
    metrics,
    packetCount: new Set(own.map((r) => r.recordedAt)).size,
    inRangePercent: checked === 0 ? 100 : Math.round((inRange / checked) * 100),
  };
}

export interface HeatDay {
  dateKey: string;
  label: string;
  /** null = tidak ada data hari itu. */
  percent: number | null;
}

/** Persen bacaan per hari (WIB) yang masuk batas normal, untuk satu node + metrik. */
export function dailyCompliance(
  readings: TelemetryReading[],
  nodeCode: string,
  metricKey: MetricKey,
  now: Date,
  days = 7,
): HeatDay[] {
  const metric = getMetric(metricKey);
  const result: HeatDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dateKeyWib(day);
    const rows = readings.filter(
      (r) =>
        r.nodeCode === nodeCode && r.metricKey === metricKey && dateKeyWib(r.recordedAt) === key,
    );
    const ok = metric ? rows.filter((r) => getMetricStatus(r.value, metric) === "ok").length : 0;
    result.push({
      dateKey: key,
      label: `${formatWeekdayWib(day)} ${Number(key.slice(8))}`,
      percent: rows.length === 0 ? null : Math.round((ok / rows.length) * 100),
    });
  }
  return result;
}

export type HeatLevel = "Penuh" | "Baik" | "Sebagian" | "Buruk" | "Kosong";

/** Tingkat warna sel heatmap (komponen Figma "HeatCell"). */
export function heatLevel(percent: number | null): HeatLevel {
  if (percent === null) return "Kosong";
  if (percent >= 95) return "Penuh";
  if (percent >= 80) return "Baik";
  if (percent >= 50) return "Sebagian";
  return "Buruk";
}

export function irrigationTotals(events: IrrigationEvent[], nodeCode?: string) {
  const own = nodeCode ? events.filter((e) => e.nodeCode === nodeCode) : events;
  return {
    count: own.length,
    liters: Math.round(own.reduce((s, e) => s + e.volumeLiters, 0) * 100) / 100,
  };
}

/** CSV ringkasan (satu baris per node + metrik) untuk tombol "Unduh CSV". */
export function reportsToCsv(reports: NodeReport[]): string {
  const header = "node,metrik,satuan,min,rata_rata,maks,batas_bawah,batas_atas,status";
  const lines = reports.flatMap((r) =>
    r.metrics.map((m) => {
      const metric = getMetric(m.metricKey);
      return [
        r.nodeCode,
        `"${metric?.label ?? m.metricKey}"`,
        metric?.unit ?? "",
        m.min,
        m.avg,
        m.max,
        metric?.normalMin ?? "",
        metric?.normalMax ?? "",
        m.status,
      ].join(",");
    }),
  );
  return [header, ...lines].join("\n");
}
