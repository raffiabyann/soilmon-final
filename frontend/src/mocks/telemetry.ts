import type { MetricKey, TelemetryReading } from "@soilmon/shared";
import { HOUR_MS } from "../lib/time";
import { round1 } from "../lib/math";
import { MOCK_NOW, mockIrrigationEvents, mockNodes } from "./data";

/**
 * Riwayat bacaan contoh: 7 hari terakhir, satu kiriman per jam per node (menit ke-20).
 * Nilai dibuat dari rumus (bukan acak) supaya hasilnya selalu sama dan "bercerita":
 * - N01 sehat; kelembaban turun pelan lalu naik setiap kali pompa menyala.
 * - N02 pH turun sepanjang minggu (perlu pengapuran) dan baterainya melemah.
 * - N02 offline sejak 08.40 WIB hari ini, jadi 2 kiriman terakhir tidak ada.
 * Hapus file ini saat frontend sudah tersambung ke backend (F6).
 */
export const HISTORY_HOURS = 7 * 24;

/** EC dan NPK belum ditampilkan di web (Spec: ditunda). */
const SHOWN_METRICS: readonly MetricKey[] = [
  "soil_temperature",
  "soil_moisture",
  "soil_ph",
  "battery_percent",
  "rssi",
];

/** Jam WIB (0–23, pecahan) dari waktu UTC. */
function hourWib(t: Date): number {
  return (t.getUTCHours() + 7 + t.getUTCMinutes() / 60) % 24;
}

/** Siklus harian: nilai tertinggi di jam `peakHour` WIB. */
function daily(base: number, amplitude: number, t: Date, peakHour: number): number {
  return base + amplitude * Math.cos(((hourWib(t) - peakHour) / 24) * 2 * Math.PI);
}

/** Kelembaban: turun `decayPerHour`, naik ±20% per liter air dari pompa di jam itu. */
function moistureSeries(nodeCode: string, start: number, decayPerHour: number): number[] {
  const values: number[] = [];
  let m = start;
  for (let h = HISTORY_HOURS - 1; h >= 0; h--) {
    const at = MOCK_NOW.getTime() - h * HOUR_MS;
    const water = mockIrrigationEvents
      .filter((e) => e.nodeCode === nodeCode)
      .filter((e) => {
        const t = new Date(e.startedAt).getTime();
        return t <= at && t > at - HOUR_MS;
      })
      .reduce((sum, e) => sum + e.volumeLiters, 0);
    // Pompa di node menjaga tanah tidak jauh di bawah 30% (ambang firmware).
    m = Math.max(30.4, m - decayPerHour + water * 20);
    values[h] = m;
  }
  return values;
}

/**
 * Cerita pagi ini di N01 (sama dengan alert & log Dashboard):
 * kelembaban turun pelan sampai 30.1% (04.20), 27.1% (05.20) → alert,
 * pompa 05.59 (0.45 L), lalu 36.3% (06.20) dan turun lagi ke 34.2% (10.20).
 */
function storyToday(series: number[]): number[] {
  const out = [...series];
  const from = out[24] ?? 34;
  for (let h = 23; h >= 6; h--) {
    out[h] = from + ((30.1 - from) * (24 - h)) / 18;
  }
  [34.2, 34.7, 35.2, 35.8, 36.3, 27.1].forEach((v, h) => {
    out[h] = v;
  });
  return out;
}

function buildReadings(): TelemetryReading[] {
  const readings: TelemetryReading[] = [];
  const moisture: Record<string, number[]> = {
    N01: storyToday(moistureSeries("N01", 36, 0.52)),
    N02: moistureSeries("N02", 64, 0.2),
  };

  for (let h = 0; h < HISTORY_HOURS; h++) {
    const t = new Date(MOCK_NOW.getTime() - h * HOUR_MS);
    const recordedAt = t.toISOString();
    const progress = 1 - h / (HISTORY_HOURS - 1); // 0 = 7 hari lalu, 1 = sekarang

    for (const node of mockNodes) {
      const isN02 = node.code === "N02";
      // N02 offline: kiriman terakhirnya 08.20 WIB, jadi 2 jam terakhir dilewati.
      if (isN02 && h < 2) {
        continue;
      }
      const values: Partial<Record<MetricKey, number>> = isN02
        ? {
            soil_temperature: round1(daily(28, 2.8, t, 13)),
            soil_moisture: round1(moisture.N02?.[h] ?? 60),
            soil_ph: round1(6.2 - 1.6 * progress + 0.1 * Math.sin(h / 3)),
            battery_percent: Math.round(34 - 16 * progress),
            rssi: Math.round(-86 + 3 * Math.sin(h / 5)),
          }
        : {
            soil_temperature: round1(daily(28.3, 3.6, t, 13)),
            soil_moisture: round1(moisture.N01?.[h] ?? 34),
            soil_ph: round1(6.5 + 0.2 * Math.sin(h / 4)),
            battery_percent: Math.round(88 - 6 * progress),
            rssi: Math.round(-70 + 4 * Math.sin(h / 6)),
          };

      // Kiriman terakhir tiap node harus sama dengan angka di kartu node (NodeSummary.latest).
      const isLatest = h === (isN02 ? 2 : 0);
      if (isLatest) {
        Object.assign(values, node.latest);
      }
      // Kejadian yang juga muncul di daftar alert (lihat mockAlerts).
      if (!isN02 && h === 21) {
        values.soil_temperature = 35.6; // 13 Okt 13.20 WIB, siang terik
      }

      for (const metricKey of SHOWN_METRICS) {
        const value = values[metricKey];
        if (value !== undefined) {
          readings.push({ nodeCode: node.code, metricKey, value, recordedAt });
        }
      }
    }
  }
  return readings;
}

export const mockReadings: TelemetryReading[] = buildReadings();
