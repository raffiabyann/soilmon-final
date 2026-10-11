import type { MetricKey } from "@soilmon/shared";
import { Badge, type BadgeTone } from "./Badge";
import { getMetric } from "../lib/metrics";
import type { MetricSummary } from "../lib/reports";

/** Sumbu gauge tiap metrik (sama dengan Figma). */
const SCALE: Partial<Record<MetricKey, [number, number]>> = {
  soil_moisture: [0, 100],
  soil_temperature: [15, 40],
  soil_ph: [3, 9],
  battery_percent: [0, 100],
  rssi: [-110, -50],
};

const STATUS: Record<
  MetricSummary["status"],
  (s: MetricSummary) => { tone: BadgeTone; label: string }
> = {
  ok: () => ({ tone: "ok", label: "Normal" }),
  warning: (s) => ({ tone: "warning", label: s.direction === "low" ? "Menurun" : "Naik" }),
  danger: (s) => ({ tone: "danger", label: s.direction === "low" ? "Rendah" : "Tinggi" }),
  none: () => ({ tone: "neutral", label: "–" }),
};

function unitLine(key: MetricKey): string {
  const m = getMetric(key);
  if (!m) return "";
  const unit = m.unit ? `${m.unit} · ` : "";
  if (m.normalMin === null && m.normalMax === null) return `${unit}tanpa batas`;
  if (m.normalMax === null) return `${unit}normal ≥ ${m.normalMin}`;
  if (m.normalMin === null) return `${unit}normal ≤ ${m.normalMax}`;
  return `${unit}normal ${m.normalMin}–${m.normalMax}`;
}

function fmt(v: number, key: MetricKey): string {
  return key === "battery_percent" || key === "rssi" ? String(Math.round(v)) : v.toFixed(1);
}

/**
 * Satu baris ringkasan (komponen Figma "SummaryRow"): nama metrik, gauge
 * (pita batas normal + batang min–maks + titik rata-rata), angka, dan status.
 */
export function SummaryRow({ s }: { s: MetricSummary }) {
  const metric = getMetric(s.metricKey);
  const [lo, hi] = SCALE[s.metricKey] ?? [s.min, s.max];
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const hasBand = metric && (metric.normalMin !== null || metric.normalMax !== null);
  const bandStart = pct(metric?.normalMin ?? lo);
  const bandEnd = pct(metric?.normalMax ?? hi);
  const status = STATUS[s.status](s);
  const spanColor =
    s.status === "danger"
      ? "bg-danger/85"
      : s.status === "warning"
        ? "bg-accent/80"
        : "bg-ink-soft/70";

  return (
    <tr className="border-b border-line-soft last:border-0 [&>td]:py-3">
      <td className="pr-3">
        <p className="text-sm font-semibold text-ink">
          {metric?.label.replace(" node", "") ?? s.metricKey}
        </p>
        <p className="text-xs text-ink-muted">{unitLine(s.metricKey)}</p>
      </td>
      <td className="pr-3">
        <div
          className="relative h-3.5 w-[170px]"
          title={`min ${s.min} · rata ${s.avg} · maks ${s.max}`}
        >
          <div className="absolute inset-x-0 top-1 h-1.5 rounded-full bg-line-soft" />
          {hasBand && (
            <div
              className="absolute top-1 h-1.5 rounded-full bg-band"
              style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
            />
          )}
          <div
            className={`absolute top-1 h-1.5 min-w-1 rounded-full ${spanColor}`}
            style={{ left: `${pct(s.min)}%`, width: `${pct(s.max) - pct(s.min)}%` }}
          />
          <div
            className={`absolute top-0.5 size-2.5 -translate-x-1/2 rounded-full border-2 bg-surface ${
              s.status === "danger" ? "border-danger" : "border-ink"
            }`}
            style={{ left: `${pct(s.avg)}%` }}
          />
        </div>
      </td>
      <td className="w-14 pl-2 text-right font-mono text-xs text-ink-soft">
        {fmt(s.min, s.metricKey)}
      </td>
      <td className="w-14 pl-2 text-right text-sm font-semibold text-ink tabular-nums">
        {fmt(s.avg, s.metricKey)}
      </td>
      <td className="w-14 pl-2 text-right font-mono text-xs text-ink-soft">
        {fmt(s.max, s.metricKey)}
      </td>
      <td className="pl-3 text-right">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
    </tr>
  );
}
