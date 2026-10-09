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
