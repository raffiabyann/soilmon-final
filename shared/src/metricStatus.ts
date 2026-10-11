import type { Metric } from "./api";

export type MetricStatus = "ok" | "low" | "high" | "unknown";

/**
 * Status nilai dibanding batas normal METRIC (Spec Topik 5 & 6).
 * Dipakai frontend (kolom Status) dan backend (pemicu ALERT), supaya aturannya sama.
 */
export function getMetricStatus(value: number, metric: Metric): MetricStatus {
  if (metric.normalMin === null && metric.normalMax === null) {
    return "unknown";
  }
  if (metric.normalMin !== null && value < metric.normalMin) {
    return "low";
  }
  if (metric.normalMax !== null && value > metric.normalMax) {
    return "high";
  }
  return "ok";
}
