import type { Metric } from "@soilmon/shared";

export interface GaugeScale {
  lo: number;
  hi: number;
}

/**
 * Sumbu gauge satu aturan untuk semua tampilan:
 * - satuan % → 0 sampai 100;
 * - punya batas bawah dan atas → batas normal diperlebar 50% ke kiri dan kanan;
 * - selain itu null (belum ada batas normal untuk dibandingkan).
 * Kalau `value` diberikan, sumbu diperlebar supaya nilainya tetap kelihatan.
 */
export function gaugeScale(metric: Metric, value?: number): GaugeScale | null {
  if (metric.unit === "%") {
    return { lo: 0, hi: 100 };
  }
  if (metric.normalMin === null || metric.normalMax === null) {
    return null;
  }
  const pad = (metric.normalMax - metric.normalMin) * 0.5;
  const lo = metric.normalMin - pad;
  const hi = metric.normalMax + pad;
  if (value === undefined) {
    return { lo, hi };
  }
  return { lo: Math.floor(Math.min(lo, value)), hi: Math.ceil(Math.max(hi, value)) };
}
