import { useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { LogoStrip } from "./LogoStrip";
import { MOCK_NOW } from "../mocks/data";
import { formatDateWib, formatTimeWib } from "../lib/time";

export function TopBar() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => item.path === pathname);

  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-3 shadow-sm">
        <LogoStrip />
        <div className="flex items-center gap-3 text-right">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
            Data contoh
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{formatDateWib(MOCK_NOW)}</p>
            <p className="text-xs text-ink-muted">{formatTimeWib(MOCK_NOW)}</p>
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-ink">{current?.label ?? "SoilMon"}</h1>
        <p className="text-sm text-ink-muted">
          {current?.description ?? "Halaman tidak ditemukan"}
        </p>
      </div>
    </header>
  );
}
