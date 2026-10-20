import { RefreshCw } from "lucide-react";
import { feedStatus } from "../lib/telemetryDisplay";
import type { TelemetryFeed } from "../lib/useTelemetryFeed";
import { Badge } from "./Badge";

/** Status koneksi ke backend + tombol muat ulang, dipakai di Dashboard dan Data History. */
export function FeedControls({ feed }: { feed: TelemetryFeed }) {
  const status = feedStatus(feed);
  return (
    <div className="flex items-center gap-2">
      <Badge tone={status.tone} dot>
        {status.label}
      </Badge>
      <button
        type="button"
        onClick={feed.refresh}
        disabled={feed.loading}
        aria-label="Muat ulang"
        title="Muat ulang"
        className="grid size-8 place-items-center rounded-full border border-line text-ink-soft hover:bg-line-soft disabled:opacity-40 pointer-coarse:size-11"
      >
        <RefreshCw className={`size-4 ${feed.loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
