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

/** Jam saja tanpa "WIB", contoh "08.40". Untuk kolom monospace. */
export function formatClockWib(iso: string | Date): string {
  return formatTimeWib(iso).replace(" WIB", "");
}
