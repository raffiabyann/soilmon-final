import type { MetricKey, TelemetryReading } from "@soilmon/shared";
import { MOCK_NOW, mockNodes } from "./data";

/**
 * Riwayat bacaan contoh: 24 jam terakhir, satu kiriman per jam per node.
 * Nilai dibuat dari rumus sederhana (bukan acak) supaya hasilnya selalu sama.
 * Hapus file ini saat frontend sudah tersambung ke backend (F6).
 */
const HOURS = 24;

function wave(base: number, amplitude: number, hour: number): number {
  return Math.round((base + amplitude * Math.sin((hour / 24) * 2 * Math.PI)) * 10) / 10;
}

function buildReadings(): TelemetryReading[] {
  const readings: TelemetryReading[] = [];
  for (let h = 0; h < HOURS; h++) {
    const recordedAt = new Date(MOCK_NOW.getTime() - h * 60 * 60 * 1000).toISOString();
    for (const node of mockNodes) {
      const isN02 = node.code === "N02";
      // N02 sedang Offline: data terakhirnya 08.40 WIB, jadi 2 jam terakhir dilewati.
      if (isN02 && h < 2) {
        continue;
      }
      const values: Partial<Record<MetricKey, number>> = {
        soil_temperature: wave(isN02 ? 26.9 : 27.8, 3, h),
        soil_moisture: wave(isN02 ? 61.5 : 34.2, 6, h),
        soil_ph: wave(isN02 ? 4.8 : 6.4, 0.3, h),
        battery_percent: Math.round((isN02 ? 18 : 82) + h * 0.3),
        rssi: Math.round(wave(isN02 ? -88 : -71, 3, h)),
      };
      for (const [metricKey, value] of Object.entries(values)) {
        readings.push({
          nodeCode: node.code,
          metricKey: metricKey as MetricKey,
          value,
          recordedAt,
        });
      }
    }
  }
  return readings;
}

export const mockReadings: TelemetryReading[] = buildReadings();
