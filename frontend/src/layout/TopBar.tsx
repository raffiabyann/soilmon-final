import { LogoStrip } from "./LogoStrip";
import { ThemeToggle } from "./ThemeToggle";
import { MOCK_NOW } from "../mocks/data";
import { formatLongDateWib, formatTimeWib } from "../lib/time";

/**
 * Baris paling atas: 4 logo mitra di kiri, kredit pembuat di tengah, lalu tema, label data contoh,
 * dan tanggal di kanan. Di bawah xl kredit turun ke baris sendiri supaya tidak berdesakan.
 */
export function TopBar() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 xl:grid xl:grid-cols-[1fr_auto_1fr]">
      <LogoStrip />
      <p className="order-last w-full text-center xl:order-none xl:w-auto">
        <span className="block text-xs text-ink-soft">Engineered for Precision by</span>
        <span className="block text-sm font-semibold text-ink">
          Universitas Multimedia Nusantara &amp; PT. IDE Kreatif Teknologi
        </span>
      </p>
      <div className="flex items-center gap-4 xl:justify-self-end">
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
