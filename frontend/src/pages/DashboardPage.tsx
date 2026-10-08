import { isOnline } from "@soilmon/shared";
import { mockNodes } from "../mocks/data";
import { PageHeader } from "./PageHeader";

/** Waktu "sekarang" tetap untuk data contoh, supaya status Online/Offline stabil. */
const MOCK_NOW = new Date("2026-10-14T03:20:00Z");

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan kondisi gateway, node, dan alert terbaru."
      />
      <ul className="space-y-2 text-sm">
        {mockNodes.map((node) => (
          <li key={node.code}>
            {node.code} ({node.name}): {isOnline(node.lastSeenAt, MOCK_NOW) ? "Online" : "Offline"},
            kelembaban {node.latest.soil_moisture ?? "-"}%
          </li>
        ))}
      </ul>
    </>
  );
}
