import { NavLink, useLocation } from "react-router";
import { NAV_ITEMS, isNavActive } from "./navItems";

/**
 * Menu utama di layar sempit (di bawah md). Sidebar 248 px tidak muat di HP,
 * jadi di sana menunya pindah ke bawah dan sidebar disembunyikan.
 */
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(item.path, pathname);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active ? "font-semibold text-brand" : "text-ink-soft"
            }`}
          >
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
