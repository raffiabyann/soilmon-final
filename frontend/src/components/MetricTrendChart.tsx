import { getMetricStatus, type MetricKey, type TelemetryReading } from "@soilmon/shared";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { MetricStatusBadge } from "./MetricStatusBadge";
import { formatValue, getMetric } from "../lib/metrics";
import { formatTimeWib } from "../lib/time";

interface MetricTrendChartProps {
  readings: TelemetryReading[];
  metricKey: MetricKey;
  /** Nilai terakhir dari NodeSummary.latest, supaya angkanya sama dengan kartu node. */
  latest: number | undefined;
}

/** Warna garis: slot biru palet referensi untuk permukaan terang (lolos validator dataviz). */
const LINE_COLOR = "#2a78d6";
const AXIS_COLOR = "#a8a29e";
const GRID_COLOR = "#f0ebe3";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Kartu metrik gaya "progress metric card" (referensi 21st.dev):
 * angka besar + status di atas, grafik area 24 jam, lalu tertinggi/terendah/rata-rata di bawah.
 * Satu kartu = satu metrik (small multiples, bukan dua sumbu).
 * Pita hijau = batas normal METRIC, supaya terlihat kapan nilai keluar batas.
 */
export function MetricTrendChart({ readings, metricKey, latest }: MetricTrendChartProps) {
  const metric = getMetric(metricKey);
  const rows = readings
    .filter((r) => r.metricKey === metricKey)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const data = rows.map((r) => ({
    time: formatTimeWib(r.recordedAt).replace(" WIB", ""),
    value: r.value,
  }));
  const values = rows.map((r) => r.value);
  const hasData = values.length > 0;
  const max = hasData ? Math.max(...values) : 0;
  const min = hasData ? Math.min(...values) : 0;
  const avg = hasData ? round1(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
  const status = latest !== undefined && metric ? getMetricStatus(latest, metric) : "unknown";
  const hasRange = metric !== undefined && (metric.normalMin !== null || metric.normalMax !== null);
  const gradientId = `area-${metricKey}`;

  return (
    <Card padded={false} className="flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <CardLabel>{metric?.label ?? metricKey}</CardLabel>
          <p className="mt-1 text-4xl font-semibold text-ink">
            {latest ?? "-"}
            {metric?.unit && (
              <span className="ml-1 text-base font-medium text-ink-muted">{metric.unit}</span>
            )}
          </p>
        </div>
        <MetricStatusBadge status={status} />
      </div>

      <div className="mt-2 h-36 bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:14px_14px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.18} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            {metric && hasRange && (
              <ReferenceArea
                y1={metric.normalMin ?? undefined}
                y2={metric.normalMax ?? undefined}
                fill="#047857"
                fillOpacity={0.07}
                ifOverflow="extendDomain"
              />
            )}
            <XAxis
              dataKey="time"
              stroke={AXIS_COLOR}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={5}
            />
            <YAxis
              stroke={AXIS_COLOR}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: AXIS_COLOR, strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e7e1d7",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#292524" }}
              itemStyle={{ color: "#57534e" }}
              labelFormatter={(label) => `${String(label)} WIB`}
              formatter={(value) => [formatValue(Number(value), metricKey), metric?.label ?? ""]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-ink-muted">
        <span>
          {hasRange
            ? `Pita hijau: normal ${metric?.normalMin ?? "-"} – ${metric?.normalMax ?? "-"}`
            : "Belum ada batas normal"}
        </span>
        {hasData && (
          <span>
            <b className="font-semibold text-ink">{max}</b> tertinggi ·{" "}
            <b className="font-semibold text-ink">{min}</b> terendah ·{" "}
            <b className="font-semibold text-ink">{avg}</b> rata-rata
          </span>
        )}
      </div>
    </Card>
  );
}
