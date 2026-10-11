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
      return "Isi ulang atau ganti baterai node.";
    default:
      return "Periksa kondisi node di lapangan.";
  }
}
