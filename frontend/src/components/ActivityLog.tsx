import type { LucideIcon } from "lucide-react";
import { CircleCheck, Droplets, Eye, TriangleAlert, WifiOff } from "lucide-react";
import { Link } from "react-router";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { buildActivityLog, type ActivityKind } from "../lib/activity";
import { dateKeyWib, formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockIrrigationEvents, mockNodes } from "../mocks/data";

/** Ikon + warna per jenis kejadian. Warna selalu ditemani ikon, tidak berdiri sendiri. */
const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  alert: { icon: TriangleAlert, className: "text-red-600" },
  ack: { icon: Eye, className: "text-ink-muted" },
  resolved: { icon: CircleCheck, className: "text-green-700" },
  irrigation: { icon: Droplets, className: "text-sky-700" },
  offline: { icon: WifiOff, className: "text-ink-muted" },
};

const SHORT_DATE = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
});

/** Log aktivitas gaya "builder log": jam di kiri (monospace), lalu node dan kejadiannya. */
export function ActivityLog() {
  const entries = buildActivityLog(mockAlerts, mockIrrigationEvents, mockNodes, MOCK_NOW);
  const todayKey = dateKeyWib(MOCK_NOW);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardLabel>&gt;_ Log aktivitas</CardLabel>
        <Link to="/alerts" className="text-xs text-brand hover:underline">
          Lihat semua alert →
        </Link>
      </div>
      <ol>
        {entries.map((entry) => {
          const style = KIND_STYLE[entry.kind];
          const isToday = dateKeyWib(entry.at) === todayKey;
          return (
            <li
              key={entry.id}
              className="flex items-center gap-4 border-b border-line/70 py-2.5 text-sm last:border-0"
            >
              <span className="w-24 shrink-0 font-mono text-xs text-ink-muted tabular-nums">
                {!isToday && `${SHORT_DATE.format(new Date(entry.at))} `}
                {formatTimeWib(entry.at).replace(" WIB", "")}
              </span>
              <style.icon className={`size-4 shrink-0 ${style.className}`} />
              <span className="w-9 shrink-0 font-mono text-xs font-semibold text-ink">
                {entry.nodeCode}
              </span>
              <span className="text-ink">{entry.text}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
