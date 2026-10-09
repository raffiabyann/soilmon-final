import type { ReactNode } from "react";

/**
 * Judul kecil kartu gaya "instrumen" (referensi Builder OS Bento):
 * huruf kapital, monospace, renggang. Dipakai semua kartu Dashboard supaya seragam.
 */
export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-ink-muted uppercase">
      {children}
    </p>
  );
}
