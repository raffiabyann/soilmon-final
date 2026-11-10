import type { IsoDateTime } from "./api";

/**
 * Node dianggap Offline kalau tidak ada data lebih dari 45 menit. Angka ini belum ditetapkan di
 * docs/. Rujukan "Spec Topik 6" yang dulu dipakai tidak ada di repositori (07 OD-16).
 */
export const OFFLINE_AFTER_MINUTES = 45;

export function isOnline(lastSeenAt: IsoDateTime | null, now: Date = new Date()): boolean {
  if (lastSeenAt === null) {
    return false;
  }
  const ageMs = now.getTime() - new Date(lastSeenAt).getTime();
  return ageMs <= OFFLINE_AFTER_MINUTES * 60 * 1000;
}
