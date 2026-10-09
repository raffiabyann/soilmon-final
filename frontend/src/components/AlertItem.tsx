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
    <li className="flex gap-3 border-b border-gray-800 py-3 last:border-0">
      <div
        className={`h-fit rounded-lg p-2 ${
          active ? "bg-red-500/15 text-red-400" : "bg-gray-800 text-gray-500"
        }`}
      >
        <TriangleAlert className="size-4" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between gap-4">
          <p className="text-sm font-medium text-gray-100">{describeAlert(alert)}</p>
          <span className="shrink-0 text-xs text-gray-500">{formatTimeWib(alert.triggeredAt)}</span>
        </div>
        <p className="text-xs text-gray-400">
          {alert.nodeCode} · {active ? "Aktif" : "Selesai"}
        </p>
        {active && <p className="mt-1 text-xs text-amber-300">Saran: {suggestAction(alert)}</p>}
      </div>
    </li>
  );
}
