import { LogoStrip } from "./LogoStrip";
import { ThemeToggle } from "./ThemeToggle";
import { MOCK_NOW } from "../mocks/data";
import { formatLongDateWib, formatTimeWib } from "../lib/time";

/** Baris paling atas: 4 logo mitra di kiri; tema, label data contoh, dan tanggal di kanan. */
export function TopBar() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <LogoStrip />
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
          <span className="size-1.5 rounded-full bg-accent" />
          Data contoh
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold text-ink">{formatLongDateWib(MOCK_NOW)}</p>
          <p className="text-xs text-ink-muted">{formatTimeWib(MOCK_NOW)}</p>
        </div>
      </div>
    </header>
  );
}
