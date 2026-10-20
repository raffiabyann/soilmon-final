import { OFFLINE_AFTER_MINUTES, isOnline } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { Clock, Router, Server, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { describeApiError, fetchNodes, type ApiNode } from "../lib/api";
import { formatAgo, formatDateTimeWib, formatTimeWib } from "../lib/time";
import { useNow } from "../lib/useNow";
import { usePolling } from "../lib/usePolling";
import { MOCK_NOW, mockGateways } from "../mocks/data";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { FeedControls } from "./FeedControls";

const REFRESH_MS = 10_000;

/** Node yang paling baru mengirim, atau undefined kalau belum ada yang pernah mengirim. */
function latestNode(nodes: ApiNode[]): ApiNode | undefined {
  return nodes
    .filter((n) => n.lastReceivedAt !== null)
    .sort((a, b) => (b.lastReceivedAt ?? "").localeCompare(a.lastReceivedAt ?? ""))[0];
}

/**
 * Status sistem. Backend, node, dan data terakhir dari GET /api/v1/nodes;
 * gateway dari mocks/ karena gateway belum mengirim ke backend.
 */
export function SystemStatusCard() {
  const nodes = usePolling(fetchNodes, "nodes", REFRESH_MS);
  const now = useNow(REFRESH_MS);
  const list = nodes.data ?? [];
  const online = list.filter((n) => isOnline(n.lastReceivedAt, now));
  const offline = list.filter((n) => !isOnline(n.lastReceivedAt, now));
  const latest = latestNode(list);
  const gateway = mockGateways[0];
  const gatewayOnline = gateway ? isOnline(gateway.lastSeenAt, MOCK_NOW) : false;
  const latestStale = latest?.lastReceivedAt ? !isOnline(latest.lastReceivedAt, now) : false;
  // Backend menjawab, tetapi tidak satu pun node mengirim dalam batas waktu.
  const connectedButSilent =
    nodes.data !== null && !nodes.error && list.length > 0 && online.length === 0;

  return (
    <Card>
      <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-line">
        <Tile icon={Server} label="Koneksi backend">
          <div className="mt-2.5">
            <FeedControls polled={nodes} />
          </div>
          <Hint>API merespons, belum tentu node aktif</Hint>
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

        <Tile icon={Wifi} label="Gateway" badge={<Badge tone="warning">Data contoh</Badge>}>
          <Value>{gatewayOnline ? "Online" : "Offline"}</Value>
          <Hint dot={gatewayOnline ? "bg-ok" : "bg-danger"}>
            {gateway?.code ?? "-"} · sync{" "}
            {gateway?.lastSeenAt ? formatTimeWib(gateway.lastSeenAt) : "-"}
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
  badge,
  children,
}: {
  icon: LucideIcon;
  label: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 xl:px-5 xl:first:pl-0 xl:last:pr-0">
      <div className="flex flex-wrap items-center gap-2">
        <CardLabel>
          <Icon className="size-3.5" /> {label}
        </CardLabel>
        {badge}
      </div>
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
