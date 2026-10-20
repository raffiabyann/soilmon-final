import type { LucideIcon } from "lucide-react";
import { CircleCheck, Droplets, Eye, RadioTower, TriangleAlert, WifiOff } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { buildActivityLog, type ActivityKind } from "../lib/activity";
import { groupPackets } from "../lib/packets";
import { DAY_MS, dateKeyWib, formatClockWib, formatLongDateWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockIrrigationEvents, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

/** Ikon + warna per jenis kejadian (komponen Figma "LogRow"). Warna selalu ditemani ikon. */
const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  telemetry: { icon: RadioTower, className: "text-brand" },
  alert: { icon: TriangleAlert, className: "text-danger-ink" },
  ack: { icon: Eye, className: "text-ink-muted" },
  resolved: { icon: CircleCheck, className: "text-ok" },
  irrigation: { icon: Droplets, className: "text-water" },
  offline: { icon: WifiOff, className: "text-danger-ink" },
};

/** Label pemisah per hari: "Hari ini · Rabu, 14 Okt", "Kemarin · ...", atau tanggalnya saja. */
function dayLabel(iso: string): string {
  const key = dateKeyWib(iso);
  const long = formatLongDateWib(iso).replace(/ \d{4}$/, "");
  if (key === dateKeyWib(MOCK_NOW)) return `Hari ini · ${long}`;
  if (key === dateKeyWib(new Date(MOCK_NOW.getTime() - DAY_MS))) return `Kemarin · ${long}`;
  return long;
}

/** Log aktivitas, dikelompokkan per hari: jam (monospace), ikon, node, lalu kalimat kejadian. */
export function ActivityLog() {
  const entries = buildActivityLog(
    mockAlerts,
    mockIrrigationEvents,
    mockNodes,
    groupPackets(mockReadings),
    MOCK_NOW,
    10,
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardLabel>Log aktivitas</CardLabel>
        <Link
          to="/history"
          className="text-xs font-semibold text-brand hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
        >
          Lihat Data History
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Belum ada aktivitas.</p>
      ) : (
        <ol className="mt-2">
          {entries.map((entry, i) => {
            const style = KIND_STYLE[entry.kind];
            const prev = entries[i - 1];
            const newDay = !prev || dateKeyWib(prev.at) !== dateKeyWib(entry.at);
            return (
              <Fragment key={entry.id}>
                {newDay && (
                  <li className="label-mono border-b border-line pt-4 pb-2">
                    {dayLabel(entry.at)}
                  </li>
                )}
                <li className="flex items-start gap-x-4 border-b border-line-soft py-3 text-sm last:border-0">
                  <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-ink-muted tabular-nums">
                    {formatClockWib(entry.at)}
                  </span>
                  <style.icon className={`mt-0.5 size-4 shrink-0 ${style.className}`} />
                  <span className="w-10 shrink-0 pt-0.5 font-mono text-xs font-semibold text-ink">
                    {entry.nodeCode}
                  </span>
                  <span className="min-w-0 flex-1 text-ink">{entry.text}</span>
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
