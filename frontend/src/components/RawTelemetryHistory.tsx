import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { TELEMETRY_NODE_CODE, describeApiError } from "../lib/api";
import { feedStatus, formatBatteryVoltage, registerAddress } from "../lib/telemetryDisplay";
import { formatDateTimeWib } from "../lib/time";
import { useTelemetryFeed } from "../lib/useTelemetryFeed";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { PageHeader } from "./PageHeader";
import { Segmented } from "./Segmented";

const REFRESH_MS = 10_000;
const REGISTER_COUNT = 7;
const LIMITS = ["20", "50", "100"] as const;
type Limit = (typeof LIMITS)[number];

/** Riwayat record telemetry asli dari API backend: nilai mentah, tanpa konversi sensor. */
export function RawTelemetryHistory() {
  const [limit, setLimit] = useState<Limit>("20");
  const feed = useTelemetryFeed(TELEMETRY_NODE_CODE, Number(limit), REFRESH_MS);
  const status = feedStatus(feed);
  const records = feed.records ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data History"
        description={`Record telemetry ${TELEMETRY_NODE_CODE} dari database lewat API backend, terbaru dulu. Register ditampilkan mentah, belum dikonversi.`}
        stat={feed.records ? records.length : "–"}
        statCaption={`record · maks ${limit}`}
      />

      <Card padded={false} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <Segmented
          ariaLabel="Jumlah record"
          value={limit}
          onChange={setLimit}
          options={LIMITS.map((value) => ({ value, label: `${value} terakhir` }))}
        />
        <div className="ml-auto flex items-center gap-2">
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
      </Card>

      {feed.error && (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger-ink"
        >
          {describeApiError(feed.error, TELEMETRY_NODE_CODE)}
          {feed.records && " Tabel menampilkan data terakhir yang berhasil dimuat."}
        </p>
      )}

      <Card padded={false} className="overflow-x-auto p-2">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="label-mono [&>th]:bg-canvas [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
              <th className="rounded-l-xl">Diterima server</th>
              <th>Waktu ukur</th>
              <th>Node</th>
              <th>Baterai</th>
              {Array.from({ length: REGISTER_COUNT }, (_, i) => (
                <th key={i} className="text-right">
                  {registerAddress(i)}
                </th>
              ))}
              <th className="rounded-r-xl text-right">ID</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="border-b border-line-soft last:border-0 [&>td]:px-4 [&>td]:py-3"
              >
                <td className="font-mono text-xs text-ink">{formatDateTimeWib(r.receivedAt)}</td>
                <td className="font-mono text-xs text-ink-muted">
                  {r.measuredAt ? formatDateTimeWib(r.measuredAt) : "—"}
                </td>
                <td className="font-mono text-xs font-semibold text-ink">{r.nodeCode}</td>
                <td className="tabular-nums text-ink">{formatBatteryVoltage(r.batteryVoltage)}</td>
                {Array.from({ length: REGISTER_COUNT }, (_, i) => (
                  <td key={i} className="text-right font-mono tabular-nums text-ink">
                    {r.rawRegisters[i] ?? "—"}
                  </td>
                ))}
                <td className="text-right font-mono text-xs text-ink-muted">{r.id}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td
                  colSpan={REGISTER_COUNT + 5}
                  className="py-10 text-center text-sm text-ink-muted"
                >
                  {feed.records
                    ? `Belum ada telemetry untuk node ${TELEMETRY_NODE_CODE}.`
                    : feed.error
                      ? "Data belum dapat dimuat."
                      : "Memuat telemetry…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <p className="px-2 text-xs text-ink-muted">
        Refresh otomatis setiap {REFRESH_MS / 1000} detik. Gateway belum mengirim lewat HTTPS, jadi
        record berasal dari kiriman manual atau simulator, bukan langsung dari sensor.
      </p>
    </div>
  );
}
