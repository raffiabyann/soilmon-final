import { getMetricStatus, type MetricKey, type TelemetryReading } from "@soilmon/shared";
import { getMetric } from "./metrics";

/**
 * Satu paket = semua bacaan satu node pada satu waktu kirim (satu baris di Data History).
 * Database menyimpan satu baris per metrik (tabel panjang); di sini dirangkai lagi per paket.
 */
export interface Packet {
  nodeCode: string;
  recordedAt: string;
  values: Partial<Record<MetricKey, number>>;
  /** Metrik yang nilainya di luar batas normal. */
  outside: MetricKey[];
}

export function groupPackets(readings: TelemetryReading[]): Packet[] {
  const byKey = new Map<string, Packet>();
  for (const r of readings) {
    const key = `${r.nodeCode}|${r.recordedAt}`;
    let packet = byKey.get(key);
    if (!packet) {
      packet = { nodeCode: r.nodeCode, recordedAt: r.recordedAt, values: {}, outside: [] };
      byKey.set(key, packet);
    }
    packet.values[r.metricKey] = r.value;
    const metric = getMetric(r.metricKey);
    const status = metric ? getMetricStatus(r.value, metric) : "unknown";
    if (status === "low" || status === "high") {
      packet.outside.push(r.metricKey);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.recordedAt.localeCompare(a.recordedAt) || a.nodeCode.localeCompare(b.nodeCode),
  );
}
