import { Droplets } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "./Card";
import { dailyIrrigationTotals, type DailyIrrigation } from "../lib/irrigation";
import { formatDateWib, formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockIrrigationEvents } from "../mocks/data";

/** Hari ini = biru (sorotan), hari sebelumnya = abu-abu (latar). */
const TODAY_COLOR = "#2a78d6";
const PAST_COLOR = "#d6d3d1";
const AXIS_COLOR = "#a8a29e";

/**
 * Kartu penyiraman gaya "animated card chart" (referensi 21st.dev):
 * grafik batang air 7 hari di atas, keterangan penyiraman terakhir di bawah.
 */
export function IrrigationCard() {
  const daily = dailyIrrigationTotals(mockIrrigationEvents, MOCK_NOW);
  const totalLiters = Math.round(daily.reduce((sum, d) => sum + d.liters, 0) * 100) / 100;
  const totalCount = daily.reduce((sum, d) => sum + d.count, 0);
  const last = mockIrrigationEvents[0];

  return (
    <Card padded={false} className="flex h-full flex-col overflow-hidden">
      <div className="relative flex-1 bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:14px_14px] px-4 pt-4">
        <div className="flex gap-2">
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink">
            7 hari · {totalLiters} L
          </span>
          <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink">
            {totalCount} kali
          </span>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="dayLabel"
                stroke={AXIS_COLOR}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f0ebe3" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e7e1d7",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#292524" }}
                itemStyle={{ color: "#57534e" }}
                labelFormatter={(_, payload) => {
                  const row = payload[0]?.payload as DailyIrrigation | undefined;
                  return row ? row.dateLabel : "";
                }}
                formatter={(value, _name, item) => {
                  const row = item.payload as DailyIrrigation;
                  return [`${String(value)} L (${row.count} kali)`, "Air"];
                }}
              />
              <Bar dataKey="liters" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {daily.map((d) => (
                  <Cell key={d.dateKey} fill={d.isToday ? TODAY_COLOR : PAST_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Droplets className="size-4 text-sky-700" />
          {last ? `Penyiraman terakhir ${last.volumeLiters} L · ${last.nodeCode}` : "Belum ada"}
        </p>
        {last && (
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatDateWib(last.startedAt)}, {formatTimeWib(last.startedAt)} ·{" "}
            {last.triggerType === "auto" ? "Otomatis" : "Manual"}
          </p>
        )}
      </div>
    </Card>
  );
}
