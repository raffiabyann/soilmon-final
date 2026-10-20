import { PanelLeft, Sprout } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { NAV_ITEMS, isNavActive } from "./navItems";

/** Sidebar terbuka (Figma: "Sidebar (terbuka)"), lebar 248 px: nama produk dan menu. */
export function SidebarPanel({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-[248px] shrink-0 flex-col rounded-[20px] border border-line bg-surface px-3 py-4 md:top-5 md:h-[calc(100vh-2.5rem)]">
      <div className="flex items-center gap-2.5 px-1 pb-3">
        <div className="grid size-9 place-items-center rounded-[10px] bg-brand text-on-accent">
          <Sprout className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-tight font-bold text-ink">SoilMon</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup sidebar"
          title="Tutup sidebar"
          className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-line-soft hover:text-ink"
        >
          <PanelLeft className="size-5" />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5" aria-label="Menu utama">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.path, pathname);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={`flex h-[38px] items-center gap-3 rounded-[10px] px-3 text-sm transition-colors ${
                active
                  ? "bg-brand-soft font-semibold text-brand"
                  : "text-ink-soft hover:bg-line-soft hover:text-ink"
              }`}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
