import type { Alert } from "@soilmon/shared";
import { CircleCheck, Eye, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { describeAlert } from "../lib/alerts";
import { formatClockWib, formatShortDateWib } from "../lib/time";
import { mockAlerts } from "../mocks/data";
import { Badge } from "./Badge";
import { Card } from "./Card";

const MAX_SHOWN = 2;

/** Belum dibaca dulu (perlu tindakan), lalu yang sudah dibaca; masing-masing terbaru dulu. */
function byImportance(a: Alert, b: Alert): number {
  const unread = Number(a.acknowledgedAt !== null) - Number(b.acknowledgedAt !== null);
  return unread || b.triggeredAt.localeCompare(a.triggeredAt);
}

/** Ringkasan alert untuk Dashboard: jumlah alert aktif dan dua yang terpenting. Detail di Alerts. */
export function ActiveAlertsCard() {
  const active = mockAlerts.filter((a) => a.resolvedAt === null).sort(byImportance);
  const unread = active.filter((a) => a.acknowledgedAt === null).length;
  const shown = active.slice(0, MAX_SHOWN);

  return (
    <Card padded={false} className="px-5 py-4 md:px-7 md:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-ink">
          {active.length === 0 ? (
            "Tidak ada alert aktif"
          ) : (
            <>
              <span className="text-lg font-bold">{active.length}</span> alert aktif
              <span className="text-ink-muted"> · {unread} belum dibaca</span>
            </>
          )}
        </p>
        <Link
          to="/alerts"
          className="text-xs font-semibold text-brand hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
        >
          Lihat semua alert
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <CircleCheck className="size-4 text-ok" /> Semua nilai dalam batas normal.
        </p>
      ) : (
        <ul className="mt-2">
          {shown.map((a) => {
            const read = a.acknowledgedAt !== null;
            const Icon = read ? Eye : TriangleAlert;
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft py-3 text-sm last:border-0 last:pb-0"
              >
                <Icon
                  className={`size-4 shrink-0 ${read ? "text-accent" : "text-danger-ink"}`}
                  aria-hidden
                />
                <span className="w-10 shrink-0 font-mono text-xs font-semibold text-ink">
                  {a.nodeCode}
                </span>
                <span className="min-w-0 flex-1 text-ink">{describeAlert(a)}</span>
                <span className="font-mono text-xs text-ink-muted tabular-nums">
                  sejak {formatShortDateWib(a.triggeredAt)} {formatClockWib(a.triggeredAt)}
                </span>
                <Badge tone={read ? "warning" : "danger"}>{read ? "Dibaca" : "Aktif"}</Badge>
              </li>
            );
          })}
          {active.length > MAX_SHOWN && (
            <li className="pt-3 text-xs text-ink-muted">
              +{active.length - MAX_SHOWN} alert lainnya di halaman Alerts
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
