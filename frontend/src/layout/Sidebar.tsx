import { Sprout } from "lucide-react";
import { NavLink } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { GatewayStatusCard } from "./GatewayStatusCard";

export function Sidebar() {
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

      <p className="px-5 pb-2 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
        Menu
      </p>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand text-white shadow-sm" : "text-stone-600 hover:bg-canvas"
              }`
            }
          >
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3">
        <GatewayStatusCard />
      </div>
    </aside>
  );
}
