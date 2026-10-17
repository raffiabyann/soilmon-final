import type { ReactNode } from "react";
import { PanelLeft, Sprout, Wifi, WifiOff } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { getShellData, isNavActive } from "./shellData";

/**
 * Sidebar tertutup (Figma: "Rail"): ikon saja, lebar 84 px.
 * Tooltip nama menu muncul saat disorot, tombol panel membuka sidebar penuh.
 */
export function Rail({ onOpen }: { onOpen: () => void }) {
  const { pathname } = useLocation();
  const { openAlertCount, gateway } = getShellData();

  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-[84px] md:top-5 md:h-[calc(100vh-2.5rem)] shrink-0 flex-col items-center gap-2 rounded-[20px] border border-line bg-surface py-4 shadow-card">
      <div className="grid size-12 place-items-center rounded-[14px] bg-brand text-on-accent">
        <Sprout className="size-6" />
      </div>
      <RailButton label="Buka sidebar" onClick={onOpen}>
        <PanelLeft className="size-5" />
      </RailButton>
      <div className="my-1 h-px w-8 bg-line" />

      <nav className="flex flex-col gap-2" aria-label="Menu utama">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.path, pathname);
          const count = item.path === "/alerts" ? openAlertCount : 0;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              aria-label={item.label}
              className={`group relative grid size-12 place-items-center rounded-[14px] transition-colors ${
                active
                  ? "bg-brand text-on-accent"
                  : "text-ink-soft hover:bg-brand-soft hover:text-brand"
              }`}
            >
              <item.icon className="size-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-surface bg-danger px-1 text-[11px] leading-4 font-semibold text-on-accent">
                  {count}
                </span>
              )}
              <Tooltip label={item.label} hint={count > 0 ? `${count} aktif` : undefined} />
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-1 items-center justify-center overflow-hidden" aria-hidden>
        <span className="rotate-180 text-[44px] font-bold tracking-[0.2em] text-brand-soft select-none [writing-mode:vertical-rl]">
          SOILMON
        </span>
      </div>

      <div
        className="relative grid size-12 place-items-center rounded-[14px] bg-brand-soft text-brand"
        title={`Gateway ${gateway.code} · ${gateway.online ? "Online" : "Offline"} · sync ${gateway.syncLabel}`}
      >
        {gateway.online ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
        <span
          className={`absolute top-1 right-1 size-2 rounded-full border-2 border-surface ${
            gateway.online ? "bg-ok" : "bg-danger"
          }`}
        />
      </div>
    </aside>
  );
}

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative grid size-12 place-items-center rounded-[14px] text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
    >
      {children}
      <Tooltip label={label} />
    </button>
  );
}

/** Tooltip gelap di kanan ikon (Figma: "Tooltip (hover)"). Warna dibalik: ink jadi latar. */
function Tooltip({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-20 ml-3 flex -translate-y-1/2 items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-canvas opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
      {hint && <span className="font-normal opacity-70">{hint}</span>}
    </span>
  );
}
