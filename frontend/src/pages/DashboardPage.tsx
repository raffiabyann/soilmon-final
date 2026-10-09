import { Bell } from "lucide-react";
import { Link } from "react-router";
import { AlertItem } from "../components/AlertItem";
import { Card } from "../components/Card";
import { IrrigationCard } from "../components/IrrigationCard";
import { NodeCard } from "../components/NodeCard";
import { SystemStatusCard } from "../components/SystemStatusCard";
import { TrendSection } from "../components/TrendSection";
import { MOCK_NOW, mockAlerts, mockNodes } from "../mocks/data";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SystemStatusCard />
        </div>
        <IrrigationCard />
      </div>

      <TrendSection />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mockNodes.map((node) => (
          <NodeCard key={node.code} node={node} now={MOCK_NOW} />
        ))}
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Bell className="size-4" /> Recent Alerts
          </h2>
          <Link to="/alerts" className="text-xs text-brand hover:underline">
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
