import type { IrrigationEvent } from "@soilmon/shared";
import { dateKeyWib, formatDateWib, formatWeekdayWib } from "./time";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyIrrigation {
  /** Tanggal WIB "2026-10-14", untuk key React. */
  dateKey: string;
  /** Label sumbu, contoh "Rab". */
  dayLabel: string;
  /** Label tooltip, contoh "14 Okt 2026". */
  dateLabel: string;
  liters: number;
  count: number;
  isToday: boolean;
}

/**
 * Total air penyiraman per hari (WIB) untuk `days` hari terakhir, urut dari yang terlama.
 * Hari tanpa penyiraman tetap muncul dengan nilai 0, supaya batangnya tidak hilang.
 * Nanti di F6 bisa pindah ke backend kalau datanya sudah banyak.
 */
export function dailyIrrigationTotals(
  events: IrrigationEvent[],
  now: Date,
  days = 7,
): DailyIrrigation[] {
  const result: DailyIrrigation[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY_MS);
    const key = dateKeyWib(day);
    const sameDay = events.filter((e) => dateKeyWib(e.startedAt) === key);
    const liters = sameDay.reduce((sum, e) => sum + e.volumeLiters, 0);
    result.push({
      dateKey: key,
      dayLabel: formatWeekdayWib(day),
      dateLabel: formatDateWib(day),
      liters: Math.round(liters * 100) / 100,
      count: sameDay.length,
      isToday: i === 0,
    });
  }
  return result;
}
