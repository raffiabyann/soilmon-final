import { ActivityLog } from "../components/ActivityLog";
import { IrrigationCard } from "../components/IrrigationCard";
import { NodeCard } from "../components/NodeCard";
import { SystemStatusCard } from "../components/SystemStatusCard";
import { TrendSection } from "../components/TrendSection";
import { MOCK_NOW, mockNodes } from "../mocks/data";

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

      <ActivityLog />
    </div>
  );
}
