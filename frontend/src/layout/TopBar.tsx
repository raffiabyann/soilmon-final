import { useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";
import { MOCK_NOW } from "../mocks/data";
import { formatDateWib, formatTimeWib } from "../lib/time";

export function TopBar() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => item.path === pathname);

  return (
    <header className="flex items-center justify-between border-b border-gray-800 pb-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">{current?.label ?? "SoilMon"}</h1>
        <p className="text-sm text-gray-400">{current?.description ?? "Halaman tidak ditemukan"}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-100">{formatDateWib(MOCK_NOW)}</p>
        <p className="text-xs text-gray-400">{formatTimeWib(MOCK_NOW)}</p>
      </div>
    </header>
  );
}
