import { useEffect, useState } from "react";

/** Waktu sekarang yang diperbarui berkala, untuk teks seperti "3 menit lalu". */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
