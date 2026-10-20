import type { IrrigationEvent } from "@soilmon/shared";
import { Droplets } from "lucide-react";
import { useState } from "react";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { round2 } from "../lib/math";
import { formatClockWib, formatShortDateWib } from "../lib/time";
import { mockIrrigationEvents, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

const PREVIEW = 6;

/** Kelembaban bacaan terakhir sebelum pompa dan bacaan pertama sesudahnya. */
function moistureAround(e: IrrigationEvent): { before?: number; after?: number } {
  const rows = mockReadings
    .filter((r) => r.nodeCode === e.nodeCode && r.metricKey === "soil_moisture")
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const before = [...rows].reverse().find((r) => r.recordedAt <= e.startedAt)?.value;
  const after = rows.find((r) => r.recordedAt > e.startedAt)?.value;
  return { before, after };
}

/** Tabel "Riwayat Penyiraman" (komponen Figma "IrrigationRow"). */
export function IrrigationTable() {
  const [showAll, setShowAll] = useState(false);
  const events = mockIrrigationEvents;
  const shown = showAll ? events : events.slice(0, PREVIEW);
  const maxLiters = Math.max(...events.map((e) => e.volumeLiters), 0.1);
  const total = round2(events.reduce((s, e) => s + e.volumeLiters, 0));

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
            <Droplets className="size-5 text-water" /> Riwayat Penyiraman
          </h2>
          <p className="text-xs text-ink-muted">Volume = perkiraan dari durasi × debit pompa.</p>
        </div>
        <p className="flex items-baseline gap-2">
          <span className="text-[30px] leading-none font-bold tracking-tight text-ink">
            {total} L
          </span>
          <span className="text-xs text-ink-muted">{events.length} kali pompa · 7 hari</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="label-mono [&>th]:bg-canvas [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-medium">
              <th className="w-[150px] rounded-l-[10px]">Waktu</th>
              <th className="w-[200px]">Node</th>
              <th className="w-[170px]">Pemicu</th>
              <th className="w-[130px]">Durasi</th>
              <th>Volume</th>
              <th className="w-[250px] rounded-r-[10px] text-right whitespace-nowrap">
                Kelembaban sebelum → sesudah
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => {
              const node = mockNodes.find((n) => n.code === e.nodeCode);
              const { before, after } = moistureAround(e);
              return (
                <tr
                  key={e.id}
                  className="border-b border-line-soft last:border-0 [&>td]:px-4 [&>td]:py-3"
                >
                  <td>
                    <p className="font-mono text-xs text-ink">{formatClockWib(e.startedAt)}</p>
                    <p className="text-xs text-ink-muted">{formatShortDateWib(e.startedAt)}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-water" />
                      <div>
                        <p className="font-mono text-xs font-semibold text-ink">{e.nodeCode}</p>
                        <p className="text-xs whitespace-nowrap text-ink-muted">{node?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge tone={e.triggerType === "auto" ? "water" : "neutral"}>
                      {e.triggerType === "auto" ? "Otomatis" : "Manual"}
                    </Badge>
                  </td>
                  <td className="font-mono text-xs text-ink">{e.durationSeconds} dtk</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-water-soft">
                        <div
                          className="h-full rounded-full bg-water"
                          style={{ width: `${(e.volumeLiters / maxLiters) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
                        {e.volumeLiters.toFixed(2)} L
                      </span>
                    </div>
                  </td>
                  <td className="text-right font-mono text-xs text-ink-soft">
                    {before !== undefined && after !== undefined
                      ? `${before.toFixed(1)}% → ${after.toFixed(1)}%`
                      : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-ink-muted">
          Menampilkan {shown.length} dari {events.length} penyiraman minggu ini
        </span>
        {events.length > PREVIEW && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="shrink-0 font-semibold whitespace-nowrap text-brand hover:underline pointer-coarse:min-h-11"
          >
            {showAll ? "Tampilkan lebih sedikit" : "Lihat semua"}
          </button>
        )}
      </div>
    </Card>
  );
}
