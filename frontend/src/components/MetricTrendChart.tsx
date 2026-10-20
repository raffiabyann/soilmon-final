import {
  getMetricStatus,
  type IrrigationEvent,
  type MetricKey,
  type MetricStatus,
  type TelemetryReading,
} from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, type BadgeTone } from "./Badge";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { round1 } from "../lib/math";
import { formatValue, getMetric, normalRangeText } from "../lib/metrics";
import { formatClockWib } from "../lib/time";

/** Warna grafik lewat token CSS, jadi otomatis ikut mode gelap. */
const C = {
  line: "var(--color-water)",
  axis: "var(--color-ink-muted)",
  grid: "var(--color-line-soft)",
  band: "var(--color-ok)",
  danger: "var(--color-danger)",
  // Teks label 11px: token -ink supaya lolos 4.5:1 di kedua tema.
  lineText: "var(--color-water-ink)",
  dangerText: "var(--color-danger-ink)",
  surface: "var(--color-surface)",
};

const STATUS_BADGE: Record<MetricStatus, { tone: BadgeTone; label: string }> = {
  ok: { tone: "ok", label: "Normal" },
  low: { tone: "danger", label: "Rendah" },
  high: { tone: "danger", label: "Tinggi" },
  unknown: { tone: "neutral", label: "–" },
};

function seriesFor(readings: TelemetryReading[], metricKey: MetricKey) {
  const rows = readings
    .filter((r) => r.metricKey === metricKey)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((r) => ({ t: new Date(r.recordedAt).getTime(), value: r.value }));
  const values = rows.map((r) => r.value);
  const has = values.length > 0;
  return {
    rows,
    max: has ? Math.max(...values) : 0,
    min: has ? Math.min(...values) : 0,
    avg: has ? round1(values.reduce((s, v) => s + v, 0) / values.length) : 0,
  };
}

function rangeText(metricKey: MetricKey): string {
  const m = getMetric(metricKey);
  return (m && normalRangeText(m)) || "tanpa batas normal";
}

function statusOf(metricKey: MetricKey, latest: number | undefined): MetricStatus {
  const metric = getMetric(metricKey);
  return latest !== undefined && metric ? getMetricStatus(latest, metric) : "unknown";
}

function BigValue({
  metricKey,
  latest,
  size,
}: {
  metricKey: MetricKey;
  latest?: number;
  size: "xl" | "lg";
}) {
  const unit = getMetric(metricKey)?.unit;
  return (
    <p className="mt-2 flex items-baseline gap-1">
      <span
        className={`font-bold tracking-tight text-ink ${size === "xl" ? "text-[44px] leading-none" : "text-[30px] leading-none"}`}
      >
        {latest ?? "-"}
      </span>
      {unit && <span className="text-sm text-ink-muted">{unit}</span>}
    </p>
  );
}

interface HeroProps {
  readings: TelemetryReading[];
  metricKey: MetricKey;
  nodeCode: string;
  latest: number | undefined;
  pumps: IrrigationEvent[];
  caption: string;
}

/**
 * Grafik utama (Figma: "Kelembaban tanah · N01"): area 24 jam dengan pita batas normal,
 * titik merah untuk bacaan di luar batas, dan garis putus-putus saat pompa menyala.
 */
export function HeroMetricChart({
  readings,
  metricKey,
  nodeCode,
  latest,
  pumps,
  caption,
}: HeroProps) {
  const metric = getMetric(metricKey);
  const { rows, max, min, avg } = seriesFor(readings, metricKey);
  const status = statusOf(metricKey, latest);
  const badge = STATUS_BADGE[status];
  const outside = metric
    ? rows.filter((r) => {
        const s = getMetricStatus(r.value, metric);
        return s === "low" || s === "high";
      })
    : [];
  const first = rows[0]?.t ?? 0;
  const last = rows[rows.length - 1]?.t ?? 0;
  const pumpsInRange = pumps.filter((p) => {
    const t = new Date(p.startedAt).getTime();
    return t >= first && t <= last;
  });
  const gradientId = `hero-${metricKey}`;
  // Label sumbu tiap 6 jam, tepat di jam kiriman (bukan jam bulat buatan recharts).
  const ticks = rows.filter((_, i) => i % 6 === 0 || i === rows.length - 1).map((r) => r.t);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardLabel>
            {metric?.label ?? metricKey} · {nodeCode}
          </CardLabel>
          <BigValue metricKey={metricKey} latest={latest} size="xl" />
          <p className="mt-2 text-xs text-ink-muted">{caption}</p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <div className="mt-4 min-h-60 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 24, right: 18, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.line} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.line} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.grid} vertical={false} />
            {metric && (metric.normalMin !== null || metric.normalMax !== null) && (
              <ReferenceArea
                y1={metric.normalMin ?? undefined}
                y2={metric.normalMax ?? undefined}
                fill={C.band}
                fillOpacity={0.1}
                ifOverflow="hidden"
              />
            )}
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => formatClockWib(new Date(t))}
              ticks={ticks}
              interval={0}
              stroke={C.axis}
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={C.axis}
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              domain={[
                (dataMin: number) =>
                  Math.floor(Math.min(dataMin, metric?.normalMin ?? dataMin) - 5),
                (dataMax: number) => Math.ceil(dataMax + 5),
              ]}
              allowDataOverflow
            />
            <Tooltip
              cursor={{ stroke: C.axis, strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "var(--shadow-card)",
              }}
              labelStyle={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}
              itemStyle={{ color: "var(--color-ink)", fontWeight: 600 }}
              labelFormatter={(t) => `${formatClockWib(new Date(Number(t)))} WIB`}
              formatter={(value) => [formatValue(Number(value), metricKey), metric?.label ?? ""]}
            />
            {pumpsInRange.map((p) => (
              <ReferenceLine
                key={p.id}
                x={new Date(p.startedAt).getTime()}
                stroke={C.line}
                strokeDasharray="3 3"
                label={{
                  value: `Pompa ${p.volumeLiters} L · ${formatClockWib(p.startedAt)}`,
                  position: "insideTopRight",
                  fill: C.lineText,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="value"
              stroke={C.line}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, stroke: C.surface, strokeWidth: 2 }}
            />
            {outside.map((r) => (
              <ReferenceDot
                key={r.t}
                x={r.t}
                y={r.value}
                r={4}
                fill={C.danger}
                stroke={C.surface}
                strokeWidth={2}
                label={{
                  value: `${formatValue(r.value, metricKey)} · ${formatClockWib(new Date(r.t))}`,
                  position: "bottom",
                  fill: C.dangerText,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-muted">
        <span>Pita hijau = {rangeText(metricKey)}</span>
        <span>
          {max} tertinggi · {min} terendah · {avg} rata-rata
        </span>
      </div>
    </Card>
  );
}

interface SparkProps {
  readings: TelemetryReading[];
  metricKey: MetricKey;
  latest: number | undefined;
  icon: LucideIcon;
  /** Grafik pendukung: nilai terakhir kecil di samping judul, tanpa angka besar dan badge status. */
  compact?: boolean;
}

/** Kartu kecil (Figma: "Suhu tanah", "pH tanah"): angka, status, garis tren tanpa sumbu. */
export function SparkMetricCard({
  readings,
  metricKey,
  latest,
  icon: Icon,
  compact = false,
}: SparkProps) {
  const metric = getMetric(metricKey);
  const { rows, max, min } = seriesFor(readings, metricKey);
  const badge = STATUS_BADGE[statusOf(metricKey, latest)];

  return (
    <Card className="flex h-full flex-col">
      {compact ? (
        <div className="flex items-baseline justify-between gap-3">
          <CardLabel>
            <Icon className="size-3.5" />
            {metric?.label ?? metricKey}
          </CardLabel>
          <p className="text-sm font-semibold text-ink tabular-nums">
            <span className="sr-only">Nilai terakhir </span>
            {latest !== undefined ? formatValue(latest, metricKey) : "-"}
          </p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardLabel>
              <Icon className="size-3.5" />
              {metric?.label ?? metricKey}
            </CardLabel>
            <BigValue metricKey={metricKey} latest={latest} size="lg" />
          </div>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      )}
      <div className={`${compact ? "mt-2" : "mt-3"} min-h-[88px] flex-1`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={C.line}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {max} tertinggi · {min} terendah · {rangeText(metricKey)}
      </p>
    </Card>
  );
}
