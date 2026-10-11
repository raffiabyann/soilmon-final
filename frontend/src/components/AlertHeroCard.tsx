import type { Alert } from "@soilmon/shared";
import { BellRing } from "lucide-react";
import { describeAlert, suggestAction } from "../lib/alerts";
import { formatTimeWib } from "../lib/time";

interface AlertHeroCardProps {
  alert: Alert;
  /** Jumlah alert lain yang juga belum dibaca, ditampilkan sebagai "+N lainnya". */
  othersCount: number;
  onAcknowledge: () => void;
}

/**
 * Kartu besar untuk alert terbaru yang belum dibaca (referensi "card-8" 21st.dev).
 * Merah-600 supaya teks putih tetap terbaca (kontras ≥ 4.5:1).
 */
export function AlertHeroCard({ alert, othersCount, onAcknowledge }: AlertHeroCardProps) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-red-600 p-6 text-white shadow-sm sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-white/20 p-2.5">
            <BellRing className="size-5" />
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-wider text-white/80 uppercase">
              Perlu ditangani · {alert.nodeCode} · sejak {formatTimeWib(alert.triggeredAt)}
              {othersCount > 0 && ` · +${othersCount} lainnya`}
            </p>
            <p className="mt-1 text-xl font-semibold">{describeAlert(alert)}</p>
            <p className="mt-1 text-sm text-white/90">Saran: {suggestAction(alert)}</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onAcknowledge}
        className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-stone-900"
      >
        Oke, saya tangani
      </button>
    </div>
  );
}
