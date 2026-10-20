import type { Metric, MetricKey } from "@soilmon/shared";
import { mockMetrics } from "../mocks/data";

const METRIC_BY_KEY = new Map<MetricKey, Metric>(mockMetrics.map((m) => [m.key, m]));

export function getMetric(key: MetricKey): Metric | undefined {
  return METRIC_BY_KEY.get(key);
}

/** Contoh: 34.2 + "%" -> "34.2%", 6.4 tanpa unit -> "6.4". */
export function formatValue(value: number, key: MetricKey): string {
  const unit = getMetric(key)?.unit;
  if (!unit) {
    return String(value);
  }
  return unit === "%" ? `${value}%` : `${value} ${unit}`;
}

/** Contoh: "normal 5.5–7.5", "normal ≥ 20%". Kosong kalau metrik tanpa batas normal. */
export function normalRangeText(metric: Metric): string {
  const { normalMin: min, normalMax: max } = metric;
  const unit = metric.unit === "%" ? "%" : metric.unit ? ` ${metric.unit}` : "";
  if (min !== null && max !== null) return `normal ${min}–${max}${unit}`;
  if (min !== null) return `normal ≥ ${min}${unit}`;
  if (max !== null) return `normal ≤ ${max}${unit}`;
  return "";
}
