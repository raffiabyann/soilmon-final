import { OFFLINE_AFTER_MINUTES, isOnline } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { Clock, Router, Server } from "lucide-react";
import type { ReactNode } from "react";
import { describeApiError, type ApiNode } from "../lib/api";
import { formatAgo, formatDateTimeWib, formatTimeWib } from "../lib/time";
import { useNow } from "../lib/useNow";
import { DASHBOARD_REFRESH_MS, type Polled } from "../lib/usePolling";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { FeedControls } from "./FeedControls";

/** Node yang paling baru mengirim, atau undefined kalau belum ada yang pernah mengirim. */
function latestNode(nodes: ApiNode[]): ApiNode | undefined {
  return nodes
    .filter((n) => n.lastReceivedAt !== null)
    .sort((a, b) => (b.lastReceivedAt ?? "").localeCompare(a.lastReceivedAt ?? ""))[0];
}

/** Keterangan di bawah badge koneksi; harus sejalan dengan badge di FeedControls. */
function connectionHint(polled: Polled<unknown>): string {
  if (polled.error) {
    if (polled.data !== null) return "Pembaruan terakhir gagal, data di bawah bisa sudah lama";
    const unreachable =
      polled.error.code === "network_error" || polled.error.code === "backend_unreachable";
    return unreachable ? "Backend tidak dapat dihubungi" : "API menjawab dengan error";
  }
  return polled.data === null ? "Menunggu jawaban API" : "API merespons, belum tentu node aktif";
}

/** Status sistem: koneksi backend, data terakhir, dan jumlah node aktif, semua dari GET /api/v1/nodes. */
export function SystemStatusCard({ nodes }: { nodes: Polled<ApiNode[]> }) {
  const now = useNow(DASHBOARD_REFRESH_MS);
  const list = nodes.data ?? [];
  const online = list.filter((n) => isOnline(n.lastReceivedAt, now));
  const offline = list.filter((n) => !isOnline(n.lastReceivedAt, now));
  const latest = latestNode(list);
  const latestStale = latest?.lastReceivedAt ? !isOnline(latest.lastReceivedAt, now) : false;
  // Backend menjawab, tetapi tidak satu pun node mengirim dalam batas waktu.
  const connectedButSilent =
    nodes.data !== null && !nodes.error && list.length > 0 && online.length === 0;

  return (
    <Card>
      <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 xl:grid-cols-3 xl:divide-x xl:divide-line">
        <Tile icon={Server} label="Koneksi backend">
          <div className="mt-2.5">
            <FeedControls polled={nodes} />
          </div>
          <Hint>{connectionHint(nodes)}</Hint>
        </Tile>

        <Tile icon={Clock} label="Data terakhir diterima">
          <Value danger={latestStale}>
            {latest?.lastReceivedAt ? formatAgo(latest.lastReceivedAt, now) : "-"}
          </Value>
          <Hint dot={latest?.lastReceivedAt ? (latestStale ? "bg-danger" : "bg-ok") : undefined}>
            {latest?.lastReceivedAt ? (
              <span title={formatDateTimeWib(latest.lastReceivedAt)}>
                {latestStale ? "Kedaluwarsa · " : ""}
                {latest.code} · {formatTimeWib(latest.lastReceivedAt)}
              </span>
            ) : nodes.data ? (
              "Belum ada node yang mengirim"
            ) : (
              "Menunggu backend"
            )}
          </Hint>
        </Tile>

        <Tile icon={Router} label="Node aktif">
          <Value danger={nodes.data !== null && list.length > 0 && online.length === 0}>
            {nodes.data ? `${online.length} / ${list.length}` : "-"}
          </Value>
          <Hint dot={nodes.data ? (offline.length === 0 ? "bg-ok" : "bg-danger") : undefined}>
            {!nodes.data
              ? "Menunggu backend"
              : list.length === 0
                ? "Belum ada node terdaftar"
                : offline.length === 0
                  ? `Semua mengirim < ${OFFLINE_AFTER_MINUTES} menit terakhir`
                  : `${offline.map((n) => n.code).join(", ")} tidak mengirim > ${OFFLINE_AFTER_MINUTES} menit`}
          </Hint>
        </Tile>
      </div>

      {connectedButSilent && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger-ink"
        >
          Backend terhubung, tetapi tidak ada node yang mengirim dalam {OFFLINE_AFTER_MINUTES} menit
          terakhir. Data yang tampil adalah kiriman terakhir, bukan kondisi sekarang.
        </p>
      )}

      {nodes.error && (
        <p role="alert" className="mt-5 text-xs text-danger-ink">
          {nodes.error.code === "not_found"
            ? "Backend belum punya GET /api/v1/nodes. Jalankan ulang backend."
            : describeApiError(nodes.error, "")}
          {nodes.data && " Menampilkan data terakhir yang berhasil dimuat."}
        </p>
      )}
    </Card>
  );
}

function Tile({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 xl:px-5 xl:first:pl-0 xl:last:pr-0">
      <CardLabel>
        <Icon className="size-3.5" /> {label}
      </CardLabel>
      {children}
    </div>
  );
}

function Value({ danger = false, children }: { danger?: boolean; children: ReactNode }) {
  return (
    <p
      className={`mt-2 text-[30px] leading-none font-bold tracking-tight ${danger ? "text-danger-ink" : "text-ink"}`}
    >
      {children}
    </p>
  );
}

function Hint({ dot, children }: { dot?: string; children: ReactNode }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />}
      {children}
    </p>
  );
}
