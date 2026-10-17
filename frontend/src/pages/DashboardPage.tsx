import { ActivityLog } from "../components/ActivityLog";
import { FarmMapCard } from "../components/FarmMapCard";
import { GreetingCard } from "../components/GreetingCard";
import { IrrigationCard } from "../components/IrrigationCard";
import { TrendSection } from "../components/TrendSection";

/** Dashboard (Figma: "Dashboard · Redesign (1440)"). */
export function DashboardPage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_440px]">
        <GreetingCard />
        <FarmMapCard />
      </div>

      <TrendSection />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_440px]">
        <ActivityLog />
        <IrrigationCard />
      </div>
    </div>
  );
}
