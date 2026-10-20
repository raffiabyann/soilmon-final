import type { ReactNode } from "react";
import { PanelLeft, Sprout } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { NAV_ITEMS, isNavActive } from "./navItems";

/**
 * Sidebar tertutup (Figma: "Rail"): ikon saja, lebar 84 px.
 * Tooltip nama menu muncul saat disorot, tombol panel membuka sidebar penuh.
 */
export function Rail({ onOpen }: { onOpen: () => void }) {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-[84px] shrink-0 flex-col items-center gap-2 rounded-[20px] border border-line bg-surface py-4 md:top-5 md:h-[calc(100vh-2.5rem)]">
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
              <Tooltip label={item.label} />
            </NavLink>
          );
        })}
      </nav>
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

/** Tooltip gelap di kanan ikon (Figma: "Tooltip (hover)"). Satu-satunya elemen bershadow: ia melayang di atas isi. */
function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-20 ml-3 -translate-y-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-canvas opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}
