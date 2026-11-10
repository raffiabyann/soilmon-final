import { Router as NodeIcon, MonitorCheck } from "lucide-react";
import { NodeStatusCards } from "../components/NodeStatusCards";
import { PageHeader } from "../components/PageHeader";
import { RawRegisterNote } from "../components/RawRegisterNote";
import { SectionHeader } from "../components/SectionHeader";
import { SystemStatusCard } from "../components/SystemStatusCard";
import { fetchNodes } from "../lib/api";
import { formatClockWib, formatLongDateWib } from "../lib/time";
import { useNow } from "../lib/useNow";
import { DASHBOARD_REFRESH_MS, usePolling } from "../lib/usePolling";

/**
 * Dashboard: status sistem dan satu kartu per node. Semua dari API (GET /nodes dan
 * GET /nodes/{node}/telemetry); register ditampilkan mentah karena belum dikalibrasi.
 */
export function DashboardPage() {
  const now = useNow(30_000);
  // GET /nodes hanya berisi node yang boleh dibaca pengguna ini; admin mendapat semuanya.
  const nodes = usePolling(fetchNodes, "nodes", DASHBOARD_REFRESH_MS);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Status node dan paket data terakhir yang masuk."
        stat={formatClockWib(now)}
        statCaption={`WIB · ${formatLongDateWib(now)}`}
      />

      <section className="space-y-3">
        <SectionHeader icon={MonitorCheck} title="Status sistem" />
        <SystemStatusCard nodes={nodes} />
      </section>

      <section className="space-y-3">
        <SectionHeader icon={NodeIcon} title="Node" />
        <RawRegisterNote />
        <NodeStatusCards nodes={nodes} />
      </section>
    </div>
  );
}
