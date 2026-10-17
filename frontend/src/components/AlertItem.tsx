import type { Alert } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, Eye, TriangleAlert } from "lucide-react";
import { Badge, type BadgeTone } from "./Badge";
import {
  alertState,
  formatDuration,
  minutesToResolve,
  normalRangeText,
  suggestAction,
  type AlertState,
} from "../lib/alerts";
import { formatValue, getMetric } from "../lib/metrics";
import { formatClockWib } from "../lib/time";
import { mockIrrigationEvents, mockNodes } from "../mocks/data";

interface AlertItemProps {
  alert: Alert;
  /** Sudah dibaca (dari data, atau ditandai di sesi ini). */
  acknowledged: boolean;
  /** Nama & jam baca untuk alert yang ditandai di sesi ini (belum ada di data). */
  ackLabel?: string;
  onAcknowledge?: () => void;
}

/** Gaya per keadaan (komponen Figma "AlertItem", Status=Aktif/Dibaca/Selesai). */
const STYLE: Record<
  AlertState,
  { icon: LucideIcon; label: string; box: string; icon_: string; badge: BadgeTone }
> = {
  active: {
    icon: TriangleAlert,
    label: "Aktif",
    box: "border-danger-line bg-danger-soft",
    icon_: "text-danger",
    badge: "danger",
  },
  acknowledged: {
    icon: Eye,
    label: "Dibaca",
    box: "border-accent/30 bg-accent-soft/60",
    icon_: "text-accent",
    badge: "warning",
  },
  resolved: {
    icon: CircleCheck,
    label: "Selesai",
    box: "border-ok/25 bg-ok-soft",
    icon_: "text-ok",
    badge: "ok",
  },
};

/** Kalimat penutup untuk alert selesai; sebut pompa kalau pompa menyala di antara mulai-selesai. */
function resolvedNote(alert: Alert): string {
  if (!alert.resolvedAt) return "";
  const pump = mockIrrigationEvents.find(
    (e) =>
      e.nodeCode === alert.nodeCode &&
      e.startedAt >= alert.triggeredAt &&
      e.startedAt <= alert.resolvedAt!,
  );
  const back = `Kembali normal ${formatClockWib(alert.resolvedAt)}.`;
  if (pump) {
    return `Pompa menyala otomatis ${formatClockWib(pump.startedAt)} (${pump.volumeLiters} L, ${pump.durationSeconds} detik). ${back}`;
  }
  return `Saran: ${suggestAction(alert)} ${back}`;
}

export function AlertItem({ alert, acknowledged, ackLabel, onAcknowledge }: AlertItemProps) {
  const state = alertState(alert, acknowledged);
  const style = STYLE[state];
  const metric = getMetric(alert.metricKey);
  const node = mockNodes.find((n) => n.code === alert.nodeCode);
  const direction = alert.type === "below_min" ? "terlalu rendah" : "terlalu tinggi";
  const when = alert.resolvedAt
    ? `${formatClockWib(alert.triggeredAt)} → ${formatClockWib(alert.resolvedAt)} WIB`
    : `mulai ${formatClockWib(alert.triggeredAt)} WIB`;
  const resolveMin = minutesToResolve(alert);

  return (
    <li className={`flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4 ${style.box}`}>
      <span className="w-12 shrink-0 font-mono text-xs text-ink-muted">
        {formatClockWib(alert.triggeredAt)}
      </span>
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface">
        <style.icon className={`size-[18px] ${style.icon_}`} />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-sm font-semibold text-ink">
            {metric?.label ?? alert.metricKey} {direction}
          </span>
          <span className="font-mono text-xs text-ink-muted">
            {alert.nodeCode} · {node?.name}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          Nilai {formatValue(alert.value, alert.metricKey)} · {normalRangeText(alert)} · {when}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {state === "resolved" ? resolvedNote(alert) : `Saran: ${suggestAction(alert)}`}
        </p>
      </div>
      <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={style.badge}>{style.label}</Badge>
        {state === "active" && onAcknowledge && (
          <button
            type="button"
            onClick={onAcknowledge}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-line-soft"
          >
            Tandai dibaca
          </button>
        )}
        {state === "acknowledged" && (
          <span className="text-xs text-ink-muted">
            {ackLabel ??
              `Dibaca ${alert.acknowledgedBy ?? ""} · ${alert.acknowledgedAt ? formatClockWib(alert.acknowledgedAt) : ""}`}
          </span>
        )}
        {state === "resolved" && resolveMin !== null && (
          <span className="text-xs text-ink-muted">Selesai dalam {formatDuration(resolveMin)}</span>
        )}
      </div>
    </li>
  );
}
