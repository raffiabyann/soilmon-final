import type { Alert } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { describeAlert, suggestAction } from "../lib/alerts";
import { formatShortDateWib, formatTimeWib } from "../lib/time";

interface AlertItemProps {
  alert: Alert;
  /** Sudah dibaca (dari data, atau ditandai di sesi ini). */
  acknowledged: boolean;
  onAcknowledge?: () => void;
}

type Tone = "active" | "acknowledged" | "resolved";

/** Gaya banner per keadaan (referensi "alert" 21st.dev, varian terang). Ikon selalu ikut. */
const TONE: Record<Tone, { icon: LucideIcon; label: string; box: string; icon_: string }> = {
  active: {
    icon: TriangleAlert,
    label: "Aktif, belum dibaca",
    box: "border-red-200 bg-red-50",
    icon_: "text-red-600",
  },
  acknowledged: {
    icon: ShieldAlert,
    label: "Sudah dibaca, belum normal",
    box: "border-amber-200 bg-amber-50",
    icon_: "text-amber-700",
  },
  resolved: {
    icon: CircleCheck,
    label: "Selesai, kembali normal",
    box: "border-green-200 bg-green-50",
    icon_: "text-green-700",
  },
};

export function AlertItem({ alert, acknowledged, onAcknowledge }: AlertItemProps) {
  const tone: Tone = alert.resolvedAt ? "resolved" : acknowledged ? "acknowledged" : "active";
  const style = TONE[tone];

  return (
    <li className={`flex gap-3 rounded-xl border px-4 py-3 ${style.box}`}>
      <style.icon className={`mt-0.5 size-4 shrink-0 ${style.icon_}`} />
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <p className="text-sm font-semibold text-ink">{describeAlert(alert)}</p>
          <span className="font-mono text-xs text-ink-muted">
            {formatShortDateWib(alert.triggeredAt)} {formatTimeWib(alert.triggeredAt)}
          </span>
        </div>
        <p className="text-xs text-stone-600">
          <span className="font-mono font-semibold">{alert.nodeCode}</span> · {style.label}
        </p>
        {tone !== "resolved" && (
          <p className="mt-1 text-xs text-stone-600">Saran: {suggestAction(alert)}</p>
        )}
      </div>
      {tone === "active" && onAcknowledge && (
        <button
          type="button"
          onClick={onAcknowledge}
          className="h-fit shrink-0 rounded-full border border-red-200 bg-surface px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Tandai dibaca
        </button>
      )}
    </li>
  );
}
