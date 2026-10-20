/** Semua waktu disimpan UTC; tampilan selalu WIB (Spec Topik 4). */
const WIB = "Asia/Jakarta";

export function formatTimeWib(iso: string | Date): string {
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return `${time} WIB`;
}

export function formatDateWib(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** Kunci tanggal menurut WIB, contoh "2026-10-14". Dipakai untuk mengelompokkan per hari. */
export function dateKeyWib(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Nama hari singkat menurut WIB, contoh "Rab". */
export function formatWeekdayWib(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: WIB, weekday: "short" }).format(
    new Date(iso),
  );
}

/** Tanggal pendek menurut WIB, contoh "13 Okt". Untuk kolom waktu yang melewati beberapa hari. */
export function formatShortDateWib(iso: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: WIB, day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}

/** Tanggal panjang menurut WIB, contoh "Rabu, 14 Okt 2026" (TopBar). */
export function formatLongDateWib(iso: string | Date): string {
  const d = new Date(iso);
  const weekday = new Intl.DateTimeFormat("id-ID", { timeZone: WIB, weekday: "long" }).format(d);
  return `${weekday}, ${formatShortDateWib(d)} ${new Intl.DateTimeFormat("id-ID", { timeZone: WIB, year: "numeric" }).format(d)}`;
}

/** Tanggal dan jam lengkap dengan detik menurut WIB, contoh "20 Okt 2026, 14.54.13 WIB". */
export function formatDateTimeWib(iso: string | Date): string {
  const text = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return `${text} WIB`;
}

/** Selisih waktu yang mudah dibaca, contoh "baru saja", "3 menit lalu", "2 hari lalu". */
export function formatAgo(iso: string | Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return "baru saja";
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

/** Jam saja tanpa "WIB", contoh "08.40". Untuk kolom monospace. */
export function formatClockWib(iso: string | Date): string {
  return formatTimeWib(iso).replace(" WIB", "");
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
