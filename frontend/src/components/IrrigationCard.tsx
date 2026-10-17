import { Droplets } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { dailyIrrigationTotals, type DailyIrrigation } from "../lib/irrigation";
import { formatClockWib, formatShortDateWib } from "../lib/time";
import { MOCK_NOW, mockIrrigationEvents } from "../mocks/data";

/**
 * Kartu "Air penyiraman · 7 hari" (Figma): total liter besar, batang per hari
 * (hari ini biru, hari lain abu), lalu penyiraman terakhir di bawah.
 */
export function IrrigationCard() {
  const daily = dailyIrrigationTotals(mockIrrigationEvents, MOCK_NOW);
  const totalLiters = Math.round(daily.reduce((sum, d) => sum + d.liters, 0) * 100) / 100;
  const totalCount = daily.reduce((sum, d) => sum + d.count, 0);
  const last = mockIrrigationEvents[0];

  return (
    <Card className="flex h-full flex-col">
      <CardLabel>Air penyiraman · 7 hari</CardLabel>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[30px] leading-none font-bold tracking-tight text-ink">
          {totalLiters} L
        </span>
        <span className="text-xs text-ink-muted">{totalCount} kali pompa menyala</span>
      </p>

      <div className="mt-4 h-48 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daily} margin={{ top: 18, right: 0, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="dayLabel"
              stroke="var(--color-ink-muted)"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-line-soft)" }}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-ink)" }}
              itemStyle={{ color: "var(--color-ink-soft)" }}
              labelFormatter={(_, payload) => {
                const row = payload[0]?.payload as DailyIrrigation | undefined;
                return row ? row.dateLabel : "";
              }}
              formatter={(value, _name, item) => {
                const row = item.payload as DailyIrrigation;
                return [`${String(value)} L (${row.count} kali)`, "Air"];
              }}
            />
            <Bar dataKey="liters" radius={[6, 6, 0, 0]} maxBarSize={32}>
              {daily.map((d) => (
                <Cell
                  key={d.dateKey}
                  fill={d.isToday ? "var(--color-water)" : "var(--color-neutral-bar)"}
                />
              ))}
              <LabelList
                dataKey="liters"
                position="top"
                content={({ x, y, width, value, index }) =>
                  index === daily.length - 1 ? (
                    <text
                      x={Number(x) + Number(width) / 2}
                      y={Number(y) - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="var(--font-mono)"
                      fill="var(--color-ink-soft)"
                    >
                      {String(value)} L
                    </text>
                  ) : null
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {last && (
        <div className="mt-4 flex items-center gap-2.5 border-t border-line pt-4">
          <Droplets className="size-5 text-water" />
          <div>
            <p className="text-sm font-semibold text-ink">
              Terakhir: {last.volumeLiters} L · {last.nodeCode}
            </p>
            <p className="text-xs text-ink-muted">
              {formatShortDateWib(last.startedAt)}, {formatClockWib(last.startedAt)} WIB ·{" "}
              {last.triggerType === "auto" ? "otomatis" : "manual"}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
