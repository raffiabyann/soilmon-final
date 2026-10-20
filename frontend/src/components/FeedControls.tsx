import { RefreshCw } from "lucide-react";
import type { Polled } from "../lib/usePolling";
import { Badge, type BadgeTone } from "./Badge";

/** Status koneksi untuk badge: data lama tetap tampil kalau refresh terakhir gagal. */
function connectionStatus(polled: Polled<unknown>): { tone: BadgeTone; label: string } {
  if (polled.error) {
    return polled.data !== null
      ? { tone: "warning", label: "Gagal memperbarui" }
      : { tone: "danger", label: "Tidak terhubung" };
  }
  if (polled.data === null) return { tone: "neutral", label: "Menghubungkan…" };
  return { tone: "ok", label: "Terhubung" };
}

/** Status koneksi ke backend + tombol muat ulang. */
export function FeedControls({ polled }: { polled: Polled<unknown> }) {
  const status = connectionStatus(polled);
  return (
    <div className="flex items-center gap-2">
      <Badge tone={status.tone} dot>
        {status.label}
      </Badge>
      <button
        type="button"
        onClick={polled.refresh}
        disabled={polled.loading}
        aria-label="Muat ulang"
        title="Muat ulang"
        className="grid size-8 place-items-center rounded-full border border-line text-ink-soft hover:bg-line-soft disabled:opacity-40 pointer-coarse:size-11"
      >
        <RefreshCw className={`size-4 ${polled.loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
