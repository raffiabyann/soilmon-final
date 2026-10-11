import type { LucideIcon } from "lucide-react";
import { Bell, ChartLine, FileText, LayoutDashboard, Settings } from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/history", label: "Data History", icon: ChartLine },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/settings", label: "Settings", icon: Settings },
];
