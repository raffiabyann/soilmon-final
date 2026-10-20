import type { LucideIcon } from "lucide-react";
import { CircleCheck, Droplets, Eye, TriangleAlert, WifiOff } from "lucide-react";
import { Link } from "react-router";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { buildActivityLog, type ActivityKind } from "../lib/activity";
import { dateKeyWib, formatClockWib, formatShortDateWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockIrrigationEvents, mockNodes } from "../mocks/data";

/** Ikon + warna per jenis kejadian (komponen Figma "LogRow"). Warna selalu ditemani ikon. */
const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  alert: { icon: TriangleAlert, className: "text-danger-ink" },
  ack: { icon: Eye, className: "text-ink-muted" },
  resolved: { icon: CircleCheck, className: "text-ok" },
  irrigation: { icon: Droplets, className: "text-water" },
  offline: { icon: WifiOff, className: "text-ink-muted" },
};

/** Log aktivitas: jam (monospace), ikon, node, lalu kalimat kejadian. */
export function ActivityLog() {
  const entries = buildActivityLog(mockAlerts, mockIrrigationEvents, mockNodes, MOCK_NOW, 7);
  const todayKey = dateKeyWib(MOCK_NOW);

  return (
    <Card className="h-full">
      <div className="mb-2 flex items-center justify-between">
        <CardLabel>Log aktivitas</CardLabel>
        <Link
          to="/alerts"
          className="text-xs font-semibold text-brand hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
        >
          Lihat semua alert
        </Link>
      </div>
      <ol>
        {entries.map((entry) => {
          const style = KIND_STYLE[entry.kind];
          const isToday = dateKeyWib(entry.at) === todayKey;
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft py-3 text-sm last:border-0"
            >
              <span className="w-24 shrink-0 font-mono whitespace-nowrap text-xs text-ink-muted tabular-nums">
                {!isToday && `${formatShortDateWib(entry.at)} `}
                {formatClockWib(entry.at)}
              </span>
              <style.icon className={`size-4 shrink-0 ${style.className}`} />
              <span className="w-8 shrink-0 font-mono text-xs font-semibold text-ink">
                {entry.nodeCode}
              </span>
              <span className="w-full min-w-0 text-ink sm:w-auto sm:flex-1">{entry.text}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
