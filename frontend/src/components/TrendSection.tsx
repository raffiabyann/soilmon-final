import { isOnline } from "@soilmon/shared";
import { ChartLine, FlaskConical, Thermometer } from "lucide-react";
import { useState } from "react";
import { HeroMetricChart, SparkMetricCard } from "./MetricTrendChart";
import { SectionHeader } from "./SectionHeader";
import { Segmented } from "./Segmented";
import { DAY_MS, formatShortDateWib, formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockIrrigationEvents, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

/** Bagian "Tren lingkungan · 24 jam": grafik kelembaban besar + kartu suhu dan pH, untuk node yang dipilih. */
export function TrendSection() {
  const [nodeCode, setNodeCode] = useState(mockNodes[0]?.code ?? "");
  const node = mockNodes.find((n) => n.code === nodeCode);
  const online = node ? isOnline(node.lastSeenAt, MOCK_NOW) : true;
  const since = MOCK_NOW.getTime() - DAY_MS;
  const readings = mockReadings.filter(
    (r) => r.nodeCode === nodeCode && new Date(r.recordedAt).getTime() > since,
  );
  const pumps = mockIrrigationEvents.filter((e) => e.nodeCode === nodeCode);

  return (
    <section className="space-y-3">
      <SectionHeader icon={ChartLine} title="Tren lingkungan · 24 jam" mock>
        <Segmented
          ariaLabel="Pilih node"
          value={nodeCode}
          onChange={setNodeCode}
          options={mockNodes.map((n) => ({ value: n.code, label: `${n.code} · ${n.name}` }))}
        />
      </SectionHeader>
      {node && !online && (
        <p role="status" className="text-sm text-danger-ink">
          {node.code} offline: kiriman terakhir{" "}
          {node.lastSeenAt
            ? `${formatShortDateWib(node.lastSeenAt)} ${formatTimeWib(node.lastSeenAt)}`
            : "tidak diketahui"}
          . Grafik berhenti di kiriman itu.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <HeroMetricChart
          readings={readings}
          metricKey="soil_moisture"
          nodeCode={nodeCode}
          latest={node?.latest.soil_moisture}
          pumps={pumps}
          caption="Garis putus-putus = pompa menyala."
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-1">
          <SparkMetricCard
            readings={readings}
            metricKey="soil_temperature"
            latest={node?.latest.soil_temperature}
            icon={Thermometer}
            compact
          />
          <SparkMetricCard
            readings={readings}
            metricKey="soil_ph"
            latest={node?.latest.soil_ph}
            icon={FlaskConical}
            compact
          />
        </div>
      </div>
    </section>
  );
}
