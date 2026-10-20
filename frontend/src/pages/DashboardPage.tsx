import { Activity, BellRing, Gauge, MonitorCheck } from "lucide-react";
import { ActiveAlertsCard } from "../components/ActiveAlertsCard";
import { AlertCalendarCard } from "../components/AlertCalendarCard";
import { ActivityLog } from "../components/ActivityLog";
import { MetricSummaryCards } from "../components/MetricSummaryCards";
import { PageHeader } from "../components/PageHeader";
import { SectionHeader } from "../components/SectionHeader";
import { SystemStatusCard } from "../components/SystemStatusCard";
import { TrendSection } from "../components/TrendSection";
import { formatClockWib, formatLongDateWib } from "../lib/time";
import { useNow } from "../lib/useNow";

/**
 * Dashboard: status sistem, ringkasan metrik, tren 24 jam, alert aktif, aktivitas terbaru.
 * Status backend, node, dan data terakhir dari API; bagian berlabel "Data contoh" dari mocks/.
 */
export function DashboardPage() {
  const now = useNow(30_000);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Kondisi kebun dan data yang masuk hari ini."
        stat={formatClockWib(now)}
        statCaption={`WIB · ${formatLongDateWib(now)}`}
      />

      <section className="space-y-3">
        <SectionHeader icon={MonitorCheck} title="Status sistem" />
        <SystemStatusCard />
      </section>

      <section className="space-y-3">
        <SectionHeader icon={Gauge} title="Kondisi terkini" mock />
        <MetricSummaryCards />
      </section>

      <TrendSection />

      <section className="space-y-3">
        <SectionHeader icon={BellRing} title="Alert aktif" mock />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
          <ActiveAlertsCard />
          <AlertCalendarCard />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader icon={Activity} title="Aktivitas terbaru" mock />
        <ActivityLog />
      </section>
    </div>
  );
}
