import type { MetricKey } from "@soilmon/shared";
import { ChartLine } from "lucide-react";
import { useState } from "react";
import { MetricTrendChart } from "./MetricTrendChart";
import { mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

const TREND_METRICS: readonly MetricKey[] = ["soil_temperature", "soil_moisture", "soil_ph"];

/** Judul + pilihan node di satu baris di atas, lalu 3 kartu metrik (filter di luar kartu). */
export function TrendSection() {
  const [nodeCode, setNodeCode] = useState(mockNodes[0]?.code ?? "");
  const node = mockNodes.find((n) => n.code === nodeCode);
  const readings = mockReadings.filter((r) => r.nodeCode === nodeCode);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <ChartLine className="size-4" /> Tren 24 Jam
        </h2>
        <div className="flex gap-2">
          {mockNodes.map((n) => (
            <button
              key={n.code}
              type="button"
              onClick={() => setNodeCode(n.code)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                nodeCode === n.code
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-ink-muted hover:bg-canvas"
              }`}
            >
              {n.code} · {n.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {TREND_METRICS.map((key) => (
          <MetricTrendChart
            key={key}
            readings={readings}
            metricKey={key}
            latest={node?.latest[key]}
          />
        ))}
      </div>
    </section>
  );
}
