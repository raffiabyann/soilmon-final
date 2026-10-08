import { NavLink } from "react-router";
import { NAV_ITEMS } from "./navItems";

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 py-5">
        <p className="text-xl font-bold text-green-800">SoilMon</p>
        <p className="text-xs text-gray-500">Monitoring kebun belimbing</p>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive
                ? "rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800"
                : "rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
