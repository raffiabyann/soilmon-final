import type { IsoDateTime } from "./api";

/** Node dianggap Offline kalau tidak ada data lebih dari 45 menit (Spec Topik 6). */
export const OFFLINE_AFTER_MINUTES = 45;

export function isOnline(lastSeenAt: IsoDateTime | null, now: Date = new Date()): boolean {
  if (lastSeenAt === null) {
    return false;
  }
  const ageMs = now.getTime() - new Date(lastSeenAt).getTime();
  return ageMs <= OFFLINE_AFTER_MINUTES * 60 * 1000;
}
