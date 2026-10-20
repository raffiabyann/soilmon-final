import { ActivityLog } from "../components/ActivityLog";
import { BackendTelemetryCard } from "../components/BackendTelemetryCard";
import { DemoDataNotice } from "../components/DemoDataNotice";
import { FarmMapCard } from "../components/FarmMapCard";
import { GreetingCard } from "../components/GreetingCard";
import { IrrigationCard } from "../components/IrrigationCard";
import { TrendSection } from "../components/TrendSection";

/** Dashboard (Figma: "Dashboard · Redesign (1440)"). */
export function DashboardPage() {
  return (
    <div className="space-y-5">
      <DemoDataNotice>
        Hanya kartu Telemetry backend yang memakai data API/database. Ringkasan, peta, tren,
        aktivitas, irigasi, status di sidebar, dan tanggal di bilah atas masih data contoh.
      </DemoDataNotice>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_440px]">
        <GreetingCard />
        <FarmMapCard />
      </div>

      <BackendTelemetryCard />

      <TrendSection />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_440px]">
        <ActivityLog />
        <IrrigationCard />
      </div>
    </div>
  );
}
