import { ActivityLog } from "../components/ActivityLog";
import { AlertCalendarCard } from "../components/AlertCalendarCard";
import { GreetingCard } from "../components/GreetingCard";
import { IrrigationCard } from "../components/IrrigationCard";
import { LatestTelemetryCard } from "../components/LatestTelemetryCard";
import { PageHeader } from "../components/PageHeader";
import { TrendSection } from "../components/TrendSection";
import { TELEMETRY_NODE_CODE } from "../lib/api";
import { formatClockWib, formatLongDateWib } from "../lib/time";
import { useNow } from "../lib/useNow";
import { useTelemetryFeed } from "../lib/useTelemetryFeed";

const REFRESH_MS = 10_000;

/**
 * Dashboard (Figma: "Dashboard · Redesign (1440)"). Kartu kondisi kebun memakai mocks/;
 * LatestTelemetryCard membaca API backend.
 */
export function DashboardPage() {
  const feed = useTelemetryFeed(TELEMETRY_NODE_CODE, 1, REFRESH_MS);
  const now = useNow(REFRESH_MS);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description="Kondisi kebun dan data yang masuk hari ini."
        stat={formatClockWib(now)}
        statCaption={`WIB · ${formatLongDateWib(now)}`}
      />

      {/* Kolom kiri mengisi tinggi kalender: grafik irigasi yang memanjang menutup sisanya. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_440px]">
        <div className="flex flex-col gap-5">
          <GreetingCard />
          <LatestTelemetryCard feed={feed} now={now} />
          <div className="flex flex-1 flex-col">
            <IrrigationCard />
          </div>
        </div>
        <AlertCalendarCard />
      </div>

      <TrendSection />

      <ActivityLog />
    </div>
  );
}
