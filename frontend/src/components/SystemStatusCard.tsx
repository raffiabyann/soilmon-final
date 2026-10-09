import { isOnline } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { Bell, Router, Wifi } from "lucide-react";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockGateways, mockNodes } from "../mocks/data";

interface Segment {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  good: boolean;
}

/**
 * Kartu pembuka Dashboard: satu kalimat ringkasan kondisi kebun,
 * lalu 3 angka status (gateway, node, alert) dalam satu kartu bersekat.
 */
export function SystemStatusCard() {
  const gateway = mockGateways[0];
  const gatewayOnline = gateway ? isOnline(gateway.lastSeenAt, MOCK_NOW) : false;
  const offlineNodes = mockNodes.filter((n) => !isOnline(n.lastSeenAt, MOCK_NOW));
  const openAlerts = mockAlerts.filter((a) => a.resolvedAt === null);

  const notes: string[] = [];
  if (openAlerts.length > 0) {
    notes.push(`${openAlerts.length} alert perlu ditangani`);
  }
  for (const node of offlineNodes) {
    const since = node.lastSeenAt ? ` sejak ${formatTimeWib(node.lastSeenAt)}` : "";
    notes.push(`${node.code} offline${since}`);
  }
  const allGood = gatewayOnline && notes.length === 0;

  const segments: Segment[] = [
    {
      icon: Wifi,
      label: "Gateway",
      value: gatewayOnline ? "Online" : "Offline",
      hint: `Sync ${gateway?.lastSeenAt ? formatTimeWib(gateway.lastSeenAt) : "-"}`,
      good: gatewayOnline,
    },
    {
      icon: Router,
      label: "Node aktif",
      value: `${mockNodes.length - offlineNodes.length} / ${mockNodes.length}`,
      hint: "Online ≤ 45 menit",
      good: offlineNodes.length === 0,
    },
    {
      icon: Bell,
      label: "Alert aktif",
      value: String(openAlerts.length),
      hint: "Belum kembali normal",
      good: openAlerts.length === 0,
    },
  ];

  return (
    <Card className="flex h-full flex-col justify-between gap-6">
      <div>
        <CardLabel>Kondisi kebun saat ini</CardLabel>
        <p className="mt-2 text-2xl font-semibold text-ink">
          {allGood ? "Semua normal" : notes.join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line">
        {segments.map((s) => (
          <div key={s.label} className="px-4 first:pl-0 last:pr-0">
            <CardLabel>
              <s.icon className="size-3.5" />
              {s.label}
            </CardLabel>
            <p className="mt-1 text-3xl font-semibold text-ink">{s.value}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
              <span className={`size-1.5 rounded-full ${s.good ? "bg-green-600" : "bg-red-600"}`} />
              {s.hint}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
