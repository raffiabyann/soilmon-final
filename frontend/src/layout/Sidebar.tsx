import { Leaf } from "lucide-react";
import { NavLink } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { GatewayStatusCard } from "./GatewayStatusCard";

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-green-800 text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <Leaf className="size-8" />
        <div>
          <p className="text-xl font-bold leading-tight">SoilMon</p>
          <p className="text-xs text-green-100/80">Soil Monitoring System</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-green-50/80 hover:bg-white/10"
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
