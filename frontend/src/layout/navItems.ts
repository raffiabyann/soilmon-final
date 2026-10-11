import type { LucideIcon } from "lucide-react";
import { Bell, ChartLine, FileText, LayoutDashboard, Settings } from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    path: "/",
    label: "Dashboard",
    description: "Ringkasan kondisi kebun",
    icon: LayoutDashboard,
  },
  {
    path: "/history",
    label: "Data History",
    description: "Riwayat bacaan sensor",
    icon: ChartLine,
  },
  { path: "/alerts", label: "Alerts", description: "Peringatan dan penyiraman", icon: Bell },
  { path: "/reports", label: "Reports", description: "Ringkasan per node", icon: FileText },
  {
    path: "/settings",
    label: "Settings",
    description: "Pengaturan sistem",
    icon: Settings,
  },
];
