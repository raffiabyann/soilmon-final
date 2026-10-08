export interface NavItem {
  path: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: "/", label: "Dashboard" },
  { path: "/history", label: "Data History" },
  { path: "/alerts", label: "Alerts" },
  { path: "/reports", label: "Reports" },
  { path: "/settings", label: "Settings" },
];
