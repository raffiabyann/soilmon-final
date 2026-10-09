import type { Alert } from "@soilmon/shared";
import { TriangleAlert } from "lucide-react";
import { describeAlert, suggestAction } from "../lib/alerts";
import { formatTimeWib } from "../lib/time";

interface AlertItemProps {
  alert: Alert;
}

export function AlertItem({ alert }: AlertItemProps) {
  const active = alert.resolvedAt === null;

  return (
    <li className="flex gap-3 border-b border-line py-3 last:border-0">
      <div
        className={`h-fit rounded-lg p-2 ${
          active ? "bg-red-50 text-red-700" : "bg-stone-100 text-ink-muted"
        }`}
      >
        <TriangleAlert className="size-4" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between gap-4">
          <p className="text-sm font-medium text-ink">{describeAlert(alert)}</p>
          <span className="shrink-0 text-xs text-ink-muted">
            {formatTimeWib(alert.triggeredAt)}
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          {alert.nodeCode} · {active ? "Aktif" : "Selesai"}
        </p>
        {active && <p className="mt-1 text-xs text-accent">Saran: {suggestAction(alert)}</p>}
      </div>
    </li>
  );
}
