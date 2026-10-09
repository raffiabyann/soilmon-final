import type { MetricKey, TelemetryReading } from "@soilmon/shared";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatValue, getMetric } from "../lib/metrics";
import { formatTimeWib } from "../lib/time";

interface MetricTrendChartProps {
  readings: TelemetryReading[];
  metricKey: MetricKey;
}

/** Warna garis: slot biru palet referensi untuk permukaan gelap (lolos validator dataviz). */
const LINE_COLOR = "#3987e5";
const AXIS_COLOR = "#6b7280";
const GRID_COLOR = "#1f2937";

/**
 * Satu grafik untuk satu metrik (small multiples, bukan dua sumbu).
 * Pita abu-abu = batas normal METRIC, supaya terlihat kapan nilai keluar batas.
 */
export function MetricTrendChart({ readings, metricKey }: MetricTrendChartProps) {
  const metric = getMetric(metricKey);
  const data = readings
    .filter((r) => r.metricKey === metricKey)
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((r) => ({ time: formatTimeWib(r.recordedAt).replace(" WIB", ""), value: r.value }));

  return (
    <div>
      <p className="text-sm font-semibold text-gray-100">{metric?.label ?? metricKey}</p>
      <p className="mb-2 text-xs text-gray-500">
        {metric?.normalMin !== null || metric?.normalMax !== null
          ? `Pita abu-abu: batas normal ${metric?.normalMin ?? "-"} sampai ${metric?.normalMax ?? "-"}`
          : "Belum ada batas normal"}
      </p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            {metric && (metric.normalMin !== null || metric.normalMax !== null) && (
              <ReferenceArea
                y1={metric.normalMin ?? undefined}
                y2={metric.normalMax ?? undefined}
                fill="#9ca3af"
                fillOpacity={0.08}
                ifOverflow="extendDomain"
              />
            )}
            <XAxis
              dataKey="time"
              stroke={AXIS_COLOR}
              tick={{ fontSize: 11 }}
              tickLine={false}
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
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#f3f4f6" }}
              itemStyle={{ color: "#d1d5db" }}
              labelFormatter={(label) => `${String(label)} WIB`}
              formatter={(value) => [formatValue(Number(value), metricKey), metric?.label ?? ""]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#111827", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
