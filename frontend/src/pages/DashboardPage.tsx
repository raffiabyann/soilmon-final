import { isOnline } from "@soilmon/shared";
import { MOCK_NOW, mockNodes } from "../mocks/data";

export function DashboardPage() {
  return (
    <ul className="space-y-2 text-sm">
      {mockNodes.map((node) => (
        <li key={node.code}>
          {node.code} ({node.name}): {isOnline(node.lastSeenAt, MOCK_NOW) ? "Online" : "Offline"},
          kelembaban {node.latest.soil_moisture ?? "-"}%
        </li>
      ))}
    </ul>
  );
}
