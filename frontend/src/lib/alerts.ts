import type { Alert } from "@soilmon/shared";
import { formatValue, getMetric } from "./metrics";

/** Kalimat alert dirangkai di frontend, tidak disimpan di database (Spec Topik 6). */
export function describeAlert(alert: Alert): string {
  const label = getMetric(alert.metricKey)?.label ?? alert.metricKey;
  const direction = alert.type === "below_min" ? "terlalu rendah" : "terlalu tinggi";
  return `${label} ${direction} (${formatValue(alert.value, alert.metricKey)})`;
}

/** Saran tindakan untuk petani; teks ditulis di kode, bukan di database. */
export function suggestAction(alert: Alert): string {
  const key = `${alert.metricKey}:${alert.type}`;
  switch (key) {
    case "soil_ph:below_min":
      return "Periksa kebutuhan pengapuran, konsultasikan dengan penyuluh.";
    case "soil_ph:above_max":
      return "Tanah terlalu basa, konsultasikan pemupukan dengan penyuluh.";
    case "soil_moisture:below_min":
      return "Pastikan pompa dan selang berfungsi.";
    case "soil_moisture:above_max":
      return "Periksa drainase, kurangi penyiraman.";
    case "battery_percent:below_min":
      return "Ganti atau isi ulang baterai, cek panel surya node.";
    case "soil_temperature:above_max":
      return "Beri mulsa atau naungan saat siang terik.";
    case "soil_temperature:below_min":
      return "Pantau terus; biasanya naik lagi saat siang.";
    default:
      return "Periksa kondisi node di lapangan.";
  }
}

export type AlertState = "active" | "acknowledged" | "resolved";

/** Aktif = belum dibaca; Dibaca = sudah ditangani tapi nilai belum normal; Selesai = normal lagi. */
export function alertState(alert: Alert, acknowledged: boolean): AlertState {
  if (alert.resolvedAt) {
    return "resolved";
  }
  return acknowledged ? "acknowledged" : "active";
}

/** Contoh: "batas normal 5.5–7.5", "batas normal ≥ 20%". */
export function normalRangeText(alert: Alert): string {
  const metric = getMetric(alert.metricKey);
  if (!metric) {
    return "";
  }
  const unit = metric.unit === "%" ? "%" : metric.unit ? ` ${metric.unit}` : "";
  if (metric.normalMin !== null && metric.normalMax !== null) {
    return `batas normal ${metric.normalMin}–${metric.normalMax}${unit}`;
  }
  if (metric.normalMin !== null) {
    return `batas normal ≥ ${metric.normalMin}${unit}`;
  }
  if (metric.normalMax !== null) {
    return `batas normal ≤ ${metric.normalMax}${unit}`;
  }
  return "";
}

/** Durasi dalam menit jadi teks pendek, contoh 75 -> "1 j 15 m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) {
    return `${m} m`;
  }
  return m === 0 ? `${h} jam` : `${h} j ${m} m`;
}

/** Lama alert sampai selesai, dalam menit (null kalau belum selesai). */
export function minutesToResolve(alert: Alert): number | null {
  if (!alert.resolvedAt) {
    return null;
  }
  return (new Date(alert.resolvedAt).getTime() - new Date(alert.triggeredAt).getTime()) / 60000;
}
