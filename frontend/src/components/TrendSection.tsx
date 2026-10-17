import { ChartLine, FlaskConical, Thermometer } from "lucide-react";
import { useState } from "react";
import { HeroMetricChart, SparkMetricCard } from "./MetricTrendChart";
import { Segmented } from "./Segmented";
import { MOCK_NOW, mockIrrigationEvents, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bagian "24 jam": grafik kelembaban besar + kartu suhu dan pH, untuk node yang dipilih. */
export function TrendSection() {
  const [nodeCode, setNodeCode] = useState(mockNodes[0]?.code ?? "");
  const node = mockNodes.find((n) => n.code === nodeCode);
  const since = MOCK_NOW.getTime() - DAY_MS;
  const readings = mockReadings.filter(
    (r) => r.nodeCode === nodeCode && new Date(r.recordedAt).getTime() > since,
  );
  const pumps = mockIrrigationEvents.filter((e) => e.nodeCode === nodeCode);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="label-mono flex items-center gap-2 text-ink">
          <ChartLine className="size-4" /> 24 jam
        </h2>
        <Segmented
          ariaLabel="Pilih node"
          value={nodeCode}
          onChange={setNodeCode}
          options={mockNodes.map((n) => ({ value: n.code, label: `${n.code} · ${n.name}` }))}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <HeroMetricChart
          readings={readings}
          metricKey="soil_moisture"
          nodeCode={nodeCode}
          latest={node?.latest.soil_moisture}
          pumps={pumps}
          caption="Pompa menyala otomatis saat di bawah 30%."
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-1">
          <SparkMetricCard
            readings={readings}
            metricKey="soil_temperature"
            latest={node?.latest.soil_temperature}
            icon={Thermometer}
          />
          <SparkMetricCard
            readings={readings}
            metricKey="soil_ph"
            latest={node?.latest.soil_ph}
            icon={FlaskConical}
          />
        </div>
      </div>
    </section>
  );
}
