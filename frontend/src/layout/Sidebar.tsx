import { Sprout } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { GatewayStatusCard } from "./GatewayStatusCard";
import { mockAlerts } from "../mocks/data";

/** Tinggi satu baris menu dalam px. Harus sama dengan class `h-11` di NavLink. */
const ITEM_HEIGHT = 44;

/** Cocokkan URL sekarang dengan menu; "/" hanya aktif kalau persis di beranda. */
function findActiveIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path),
  );
}

/**
 * Sidebar melayang dengan menu gaya "tree nav" (referensi 21st.dev):
 * garis rel vertikal + penanda wajik yang meluncur ke menu yang disorot,
 * lalu kembali ke menu aktif saat mouse keluar. Animasi cukup pakai CSS transition.
 */
export function Sidebar() {
  const { pathname } = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = findActiveIndex(pathname);
  const markerIndex = hoveredIndex ?? activeIndex;
  const openAlertCount = mockAlerts.filter((alert) => alert.resolvedAt === null).length;

  return (
    <aside className="sticky top-4 flex h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="rounded-xl bg-brand p-2 text-white">
          <Sprout className="size-6" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-ink">SoilMon</p>
          <p className="text-xs text-ink-muted">Kebun Belimbing Tuban</p>
        </div>
      </div>

      <p className="px-5 pb-3 font-mono text-[11px] tracking-wider text-ink-muted uppercase">
        Menu
      </p>
      <nav
        className="relative mr-3 ml-6 flex flex-col border-l border-line"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {markerIndex >= 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-11 transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
            style={{ transform: `translateY(${markerIndex * ITEM_HEIGHT}px)` }}
          >
            <span className="absolute top-1/2 left-[-5.5px] size-2.5 -translate-y-1/2 rotate-45 rounded-xs bg-brand" />
            <span className="absolute inset-y-1 right-0 left-3 rounded-lg bg-brand-soft" />
          </div>
        )}

        {NAV_ITEMS.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onMouseEnter={() => setHoveredIndex(index)}
            onFocus={() => setHoveredIndex(index)}
            onBlur={() => setHoveredIndex(null)}
            className={({ isActive }) =>
              `relative ml-3 flex h-11 items-center gap-3 px-3 text-sm transition-colors ${
                isActive ? "font-semibold text-brand" : "text-stone-600 hover:text-ink"
              }`
            }
          >
            <item.icon className="size-4.5" />
            {item.label}
            {item.path === "/alerts" && openAlertCount > 0 && (
              <span className="ml-auto rounded-full bg-red-50 px-1.5 text-[11px] font-semibold text-red-700">
                {openAlertCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <GatewayStatusCard />
      </div>
    </aside>
  );
}
