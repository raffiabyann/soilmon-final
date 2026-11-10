import { OFFLINE_AFTER_MINUTES, isOnline } from "@soilmon/shared";
import { Battery, Clock } from "lucide-react";
import { REGISTER_LABELS, describeApiError, fetchNodeTelemetry, type ApiNode } from "../lib/api";
import { formatAgo, formatDateTimeWib } from "../lib/time";
import { useNow } from "../lib/useNow";
import { DASHBOARD_REFRESH_MS, usePolling, type Polled } from "../lib/usePolling";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";

/**
 * Satu kartu per node dari GET /api/v1/nodes: online atau offline, waktu paket terakhir, lalu
 * tegangan baterai dan register mentah dari paket terakhir (GET .../telemetry?limit=1).
 */
export function NodeStatusCards({ nodes }: { nodes: Polled<ApiNode[]> }) {
  const now = useNow(DASHBOARD_REFRESH_MS);

  if (nodes.data === null) {
    // Penyebab error sudah tampil di Status sistem; di sini tidak diulang.
    if (nodes.error) {
      return (
        <Card>
          <p className="text-sm text-ink-muted">
            Daftar node belum bisa dimuat. Penyebabnya ada di Status sistem di atas.
          </p>
        </Card>
      );
    }
    return (
      <Card>
        <p role="status" className="text-sm text-ink-muted">
          Memuat daftar node…
        </p>
      </Card>
    );
  }
  if (nodes.data.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-muted">Belum ada node yang bisa Anda akses.</p>
      </Card>
    );
  }
  const backendFailing = nodes.error !== null;
  return (
    <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {nodes.data.map((node) => (
        <li key={node.code}>
          <NodeCard node={node} now={now} backendFailing={backendFailing} />
        </li>
      ))}
    </ul>
  );
}

function NodeCard({
  node,
  now,
  backendFailing,
}: {
  node: ApiNode;
  now: Date;
  backendFailing: boolean;
}) {
  const { lastReceivedAt } = node;
  const online = isOnline(lastReceivedAt, now);
  return (
    <Card className="h-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-ink">{node.code}</h3>
        {lastReceivedAt === null ? (
          <Badge tone="neutral">Belum pernah mengirim</Badge>
        ) : (
          <Badge tone={online ? "ok" : "danger"}>{online ? "Online" : "Offline"}</Badge>
        )}
      </div>

      {lastReceivedAt === null ? (
        <p className="text-sm text-ink-muted">
          Belum ada paket dari node ini. Kartu terisi setelah gateway mengirim paket pertama.
        </p>
      ) : (
        <>
          <div>
            <CardLabel>
              <Clock className="size-3.5" aria-hidden /> Paket terakhir
            </CardLabel>
            <p className="mt-1.5 font-mono text-sm text-ink">{formatDateTimeWib(lastReceivedAt)}</p>
            <p className={`mt-0.5 text-xs ${online ? "text-ink-muted" : "text-danger-ink"}`}>
              {formatAgo(lastReceivedAt, now)}
              {!online &&
                `. Tidak mengirim lebih dari ${OFFLINE_AFTER_MINUTES} menit, nilai di bawah adalah kiriman terakhir.`}
            </p>
          </div>
          <LatestPacket nodeCode={node.code} backendFailing={backendFailing} />
        </>
      )}
    </Card>
  );
}

/**
 * `backendFailing`: GET /nodes juga gagal, jadi penyebabnya backend dan sudah tampil di Status
 * sistem. Pesan per kartu hanya untuk telemetry satu node yang gagal sementara backend normal.
 */
function LatestPacket({ nodeCode, backendFailing }: { nodeCode: string; backendFailing: boolean }) {
  const latest = usePolling(
    (signal) => fetchNodeTelemetry(nodeCode, { limit: 1, signal }),
    nodeCode,
    DASHBOARD_REFRESH_MS,
  );

  if (latest.data === null) {
    if (latest.error && backendFailing) {
      return <p className="text-sm text-ink-muted">Paket terakhir belum termuat.</p>;
    }
    if (latest.error) {
      return (
        <div role="alert" className="text-xs text-danger-ink">
          <p>{describeApiError(latest.error, nodeCode)}</p>
          <button
            type="button"
            onClick={latest.refresh}
            className="mt-2 rounded-xl border border-line px-4 py-2 font-semibold text-ink-soft hover:bg-line-soft pointer-coarse:min-h-11"
          >
            Coba lagi
          </button>
        </div>
      );
    }
    return (
      <p role="status" className="text-sm text-ink-muted">
        Memuat paket terakhir…
      </p>
    );
  }

  const record = latest.data[0];
  if (!record) {
    return <p className="text-sm text-ink-muted">Paket terakhir tidak ditemukan.</p>;
  }
  return (
    <>
      <div>
        <CardLabel>
          <Battery className="size-3.5" aria-hidden /> Baterai
        </CardLabel>
        <p className="mt-1.5 text-2xl leading-none font-bold tracking-tight text-ink tabular-nums">
          {record.batteryVoltage === null ? (
            <>
              <span aria-hidden>-</span>
              <span className="sr-only">tidak ada</span>
            </>
          ) : (
            <>
              {record.batteryVoltage.toFixed(2)}
              <span className="ml-1 text-sm font-semibold text-ink-muted">V</span>
            </>
          )}
        </p>
      </div>
      <div>
        <CardLabel>Register mentah</CardLabel>
        <dl className="mt-2 grid grid-cols-4 gap-x-3 gap-y-3">
          {REGISTER_LABELS.map((label, i) => (
            <div key={label}>
              <dt className="font-mono text-[11px] text-ink-muted">{label}</dt>
              <dd className="font-mono text-sm text-ink tabular-nums">
                {record.rawRegisters[i] === undefined ? (
                  <>
                    <span aria-hidden>-</span>
                    <span className="sr-only">tidak ada</span>
                  </>
                ) : (
                  record.rawRegisters[i]
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {latest.error && !backendFailing && (
        <p role="alert" className="text-xs text-danger-ink">
          Gagal memperbarui. Menampilkan paket terakhir yang berhasil dimuat.
        </p>
      )}
    </>
  );
}
