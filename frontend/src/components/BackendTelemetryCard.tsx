import { RefreshCw } from "lucide-react";
import { TELEMETRY_NODE_CODE, describeApiError } from "../lib/api";
import { feedStatus, formatBatteryVoltage, registerAddress } from "../lib/telemetryDisplay";
import { formatDateTimeWib } from "../lib/time";
import { useTelemetryFeed } from "../lib/useTelemetryFeed";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";

const REFRESH_MS = 10_000;

/** Record terbaru node demo, langsung dari API backend (PostgreSQL). Bukan data contoh. */
export function BackendTelemetryCard() {
  const feed = useTelemetryFeed(TELEMETRY_NODE_CODE, 1, REFRESH_MS);
  const status = feedStatus(feed);
  const record = feed.records?.[0];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardLabel>Telemetry backend · {TELEMETRY_NODE_CODE}</CardLabel>
          <h2 className="mt-1 text-lg font-semibold text-ink">Record terbaru dari API</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Data asli dari database lewat <span className="font-mono text-xs">GET /api/v1</span>,
            bukan data contoh. Gateway belum mengirim lewat HTTPS, jadi record ini berasal dari
            kiriman manual atau simulator, bukan langsung dari sensor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <button
            type="button"
            onClick={feed.refresh}
            disabled={feed.loading}
            aria-label="Muat ulang"
            className="grid size-8 place-items-center rounded-full border border-line text-ink-soft hover:bg-line-soft disabled:opacity-40 pointer-coarse:size-11"
          >
            <RefreshCw className={`size-4 ${feed.loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {feed.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger-ink"
        >
          {describeApiError(feed.error, TELEMETRY_NODE_CODE)}
          {feed.records && feed.lastSuccessAt && (
            <>
              {" "}
              Menampilkan data terakhir yang berhasil dimuat (
              {formatDateTimeWib(feed.lastSuccessAt)}).
            </>
          )}
        </p>
      )}

      {!feed.records && !feed.error && (
        <p className="mt-4 text-sm text-ink-muted">Memuat telemetry…</p>
      )}

      {feed.records && !record && (
        <p className="mt-4 text-sm text-ink-muted">
          Belum ada telemetry untuk node {TELEMETRY_NODE_CODE}.
        </p>
      )}

      {record && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Tegangan baterai" value={formatBatteryVoltage(record.batteryVoltage)} />
            <Stat label="Jumlah register" value={String(record.rawRegisters.length)} />
            <Stat label="ID record" value={record.id} mono />
            <Stat label="Diterima server" value={formatDateTimeWib(record.receivedAt)} small />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Register mentah (uint16)</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Belum dikonversi: arti, tanda, skala, dan satuan tiap register belum diverifikasi.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {record.rawRegisters.map((value, index) => (
                <div key={index} className="rounded-xl bg-line-soft p-3">
                  <p className="font-mono text-xs text-ink-muted">{registerAddress(index)}</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-ink tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-ink-muted">
            Waktu ukur: {record.measuredAt ? formatDateTimeWib(record.measuredAt) : "tidak dikirim"}{" "}
            · Refresh otomatis setiap {REFRESH_MS / 1000} detik.
          </p>
        </>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  mono = false,
  small = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={`mt-2 font-semibold text-ink ${small ? "text-sm" : "text-xl"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
