import { PanelLeft, Sprout, Wifi, WifiOff } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { getShellData, isNavActive } from "./shellData";

/**
 * Sidebar terbuka gaya Claude (Figma: "Sidebar (terbuka)"), lebar 248 px:
 * menu (NavRow), daftar node (NodeRow), status gateway, dan akun di bawah.
 */
export function SidebarPanel({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const { openAlertCount, gateway, nodes } = getShellData();

  return (
    <aside className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-[248px] md:top-5 md:h-[calc(100vh-2.5rem)] shrink-0 flex-col rounded-[20px] border border-line bg-surface px-3 py-4 shadow-card">
      <div className="flex items-center gap-2.5 px-1 pb-3">
        <div className="grid size-9 place-items-center rounded-[10px] bg-brand text-on-accent">
          <Sprout className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-tight font-bold text-ink">SoilMon</p>
          <p className="text-xs text-ink-muted">Kebun Belimbing</p>
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
          const count = item.path === "/alerts" ? openAlertCount : 0;
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
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] leading-5 font-semibold text-on-accent">
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <p className="label-mono px-3 pt-5 pb-1.5">Node · {nodes.length}</p>
      <ul className="flex flex-col gap-0.5">
        {nodes.map((n) => (
          <li key={n.code}>
            <Link
              to={`/history?node=${n.code}`}
              className="flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-sm hover:bg-line-soft"
              title={n.online ? "Online" : "Offline"}
            >
              <span className={`size-2 rounded-full ${n.online ? "bg-ok" : "bg-danger"}`} />
              <span className="font-mono text-xs font-semibold text-ink">{n.code}</span>
              <span className="flex-1 truncate text-ink-soft">{n.name}</span>
              <span className="font-mono text-[11px] text-ink-muted">{n.lastSeen}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-brand-soft px-3 py-2.5">
          {gateway.online ? (
            <Wifi className="size-5 text-brand" />
          ) : (
            <WifiOff className="size-5 text-danger-ink" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">
              Gateway {gateway.code} · {gateway.online ? "Online" : "Offline"}
            </p>
            <p className="text-xs text-ink-muted">Sync {gateway.syncLabel}</p>
          </div>
        </div>
        <div className="h-px bg-line" />
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <div className="grid size-8 place-items-center rounded-full bg-brand text-xs font-bold text-on-accent">
            PK
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Pemilik Kebun</p>
            <p className="text-xs text-ink-muted">owner</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
