import type { BadgeTone } from "../components/Badge";
import type { TelemetryFeed } from "./useTelemetryFeed";

/** Tegangan baterai seperti dilaporkan node (volt, belum dikalibrasi). */
export function formatBatteryVoltage(volts: number | null): string {
  return volts === null ? "-" : `${volts.toFixed(2)} V`;
}

/** Status koneksi untuk badge: data lama tetap tampil kalau refresh terakhir gagal. */
export function feedStatus(feed: TelemetryFeed): { tone: BadgeTone; label: string } {
  if (feed.error) {
    return feed.records
      ? { tone: "warning", label: "Gagal memperbarui" }
      : { tone: "danger", label: "Tidak terhubung" };
  }
  if (!feed.records) return { tone: "neutral", label: "Menghubungkan…" };
  return { tone: "ok", label: "Terhubung ke backend" };
}
