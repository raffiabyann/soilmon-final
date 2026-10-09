import { getMetricStatus, isOnline, type MetricKey, type NodeSummary } from "@soilmon/shared";
import { BatteryMedium, Clock, Cpu, Signal } from "lucide-react";
import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { getMetric } from "../lib/metrics";
import { formatTimeWib } from "../lib/time";

interface NodeCardProps {
  node: NodeSummary;
  now: Date;
}

const MAIN_METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "soil_temperature", label: "Suhu", unit: "°C" },
  { key: "soil_moisture", label: "Kelembaban", unit: "%" },
  { key: "soil_ph", label: "pH", unit: "" },
];

/** Warna angka: merah kalau di luar batas normal METRIC. */
function valueClass(key: MetricKey, value: number | undefined): string {
  const metric = getMetric(key);
  if (value === undefined || !metric) {
    return "text-ink";
  }
  const status = getMetricStatus(value, metric);
  return status === "low" || status === "high" ? "text-red-600" : "text-ink";
}

export function NodeCard({ node, now }: NodeCardProps) {
  const online = isOnline(node.lastSeenAt, now);
  const battery = node.latest.battery_percent;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/15 p-2.5 text-blue-400">
            <Cpu className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-ink">{node.code}</p>
            <p className="text-xs text-ink-muted">{node.name}</p>
          </div>
        </div>
        <StatusBadge online={online} />
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-line text-center">
        {MAIN_METRICS.map((m) => {
          const value = node.latest[m.key];
          return (
            <div key={m.key}>
              <p className={`text-2xl font-bold ${valueClass(m.key, value)}`}>
                {value ?? "-"}
                <span className="text-sm font-normal text-ink-muted">{m.unit}</span>
              </p>
              <p className="text-xs text-ink-muted">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-xs text-stone-600">
        <span className={`flex items-center gap-1.5 ${valueClass("battery_percent", battery)}`}>
          <BatteryMedium className="size-4" />
          {battery ?? "-"}%
        </span>
        <span className="flex items-center gap-1.5">
          <Signal className="size-4" />
          {node.latest.rssi ?? "-"} dBm
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" />
          {node.lastSeenAt ? formatTimeWib(node.lastSeenAt) : "-"}
        </span>
      </div>
    </Card>
  );
}
