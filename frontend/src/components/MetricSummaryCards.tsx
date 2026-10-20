import { getMetricStatus, isOnline, type MetricKey, type MetricStatus } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { BatteryMedium, Droplets, FlaskConical, Thermometer } from "lucide-react";
import { formatValue, getMetric, normalRangeText } from "../lib/metrics";
import { formatClockWib } from "../lib/time";
import { MOCK_NOW, mockNodes } from "../mocks/data";
import { Badge, type BadgeTone } from "./Badge";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";

const CARDS: { key: MetricKey; icon: LucideIcon }[] = [
  { key: "soil_moisture", icon: Droplets },
  { key: "soil_temperature", icon: Thermometer },
  { key: "soil_ph", icon: FlaskConical },
  { key: "battery_percent", icon: BatteryMedium },
];

const STATUS: Record<MetricStatus, { tone: BadgeTone; label: string }> = {
  ok: { tone: "ok", label: "Normal" },
  low: { tone: "danger", label: "Rendah" },
  high: { tone: "danger", label: "Tinggi" },
  unknown: { tone: "neutral", label: "-" },
};

/**
 * Empat kartu ringkasan: nilai terakhir tiap node untuk satu metrik, dibanding batas normalnya.
 * Nilai dari mocks/ (sudah dalam satuan sensor), bukan konversi register.
 */
export function MetricSummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, icon: Icon }) => {
        const metric = getMetric(key);
        return (
          <Card key={key} className="flex flex-col gap-4">
            <div>
              <CardLabel>
                <Icon className="size-3.5" /> {metric?.label ?? key}
              </CardLabel>
              <p className="mt-1 text-xs text-ink-muted">
                {metric ? normalRangeText(metric) || "tanpa batas normal" : ""}
              </p>
            </div>
            <ul className="divide-y divide-line-soft">
              {mockNodes.map((n) => {
                const value = n.latest[key];
                const status =
                  STATUS[
                    value !== undefined && metric ? getMetricStatus(value, metric) : "unknown"
                  ];
                const online = isOnline(n.lastSeenAt, MOCK_NOW);
                return (
                  <li key={n.code} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs font-semibold text-ink">
                        {n.code}
                      </span>
                      {online ? (
                        <span className="block truncate text-xs text-ink-muted">{n.name}</span>
                      ) : (
                        <span className="block truncate text-xs font-semibold text-danger-ink">
                          Offline · data {n.lastSeenAt ? formatClockWib(n.lastSeenAt) : "-"}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-2xl leading-none font-bold tracking-tight tabular-nums ${online ? "text-ink" : "text-ink-muted"}`}
                      title={
                        online
                          ? undefined
                          : "Nilai terakhir sebelum node offline, sudah kedaluwarsa"
                      }
                    >
                      {value !== undefined ? formatValue(value, key) : "-"}
                    </span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
