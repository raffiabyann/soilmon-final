import { isOnline } from "@soilmon/shared";
import { Bell, Droplets, Router, Wifi } from "lucide-react";
import { Link } from "react-router";
import { AlertItem } from "../components/AlertItem";
import { Card } from "../components/Card";
import { NodeCard } from "../components/NodeCard";
import { StatCard } from "../components/StatCard";
import { TrendSection } from "../components/TrendSection";
import { formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockGateways, mockIrrigationEvents, mockNodes } from "../mocks/data";

export function DashboardPage() {
  const gateway = mockGateways[0];
  const gatewayOnline = gateway ? isOnline(gateway.lastSeenAt, MOCK_NOW) : false;
  const onlineNodes = mockNodes.filter((n) => isOnline(n.lastSeenAt, MOCK_NOW)).length;
  const activeAlerts = mockAlerts.filter((a) => a.resolvedAt === null);
  const lastIrrigation = mockIrrigationEvents[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wifi}
          label="Gateway"
          value={gatewayOnline ? "Online" : "Offline"}
          hint={`Last sync ${gateway?.lastSeenAt ? formatTimeWib(gateway.lastSeenAt) : "-"}`}
          tone={gatewayOnline ? "green" : "red"}
        />
        <StatCard
          icon={Router}
          label="Node aktif"
          value={`${onlineNodes} / ${mockNodes.length}`}
          hint="Online dalam 45 menit terakhir"
          tone={onlineNodes === mockNodes.length ? "green" : "red"}
        />
        <StatCard
          icon={Bell}
          label="Alert aktif"
          value={String(activeAlerts.length)}
          hint="Belum kembali normal"
          tone={activeAlerts.length > 0 ? "red" : "green"}
        />
        <StatCard
          icon={Droplets}
          label="Penyiraman terakhir"
          value={lastIrrigation ? `${lastIrrigation.volumeLiters} L` : "-"}
          hint={
            lastIrrigation
              ? `${lastIrrigation.nodeCode} · ${formatTimeWib(lastIrrigation.startedAt)}`
              : "Belum ada"
          }
        />
      </div>

      <TrendSection />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mockNodes.map((node) => (
          <NodeCard key={node.code} node={node} now={MOCK_NOW} />
        ))}
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-gray-100">
            <Bell className="size-4" /> Recent Alerts
          </h2>
          <Link to="/alerts" className="text-xs text-green-400 hover:underline">
            Lihat semua →
          </Link>
        </div>
        <ul>
          {mockAlerts.slice(0, 5).map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
