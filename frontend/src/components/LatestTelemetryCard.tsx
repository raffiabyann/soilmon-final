import { TELEMETRY_NODE_CODE, describeApiError } from "../lib/api";
import { formatBatteryVoltage } from "../lib/telemetryDisplay";
import { formatAgo, formatDateTimeWib } from "../lib/time";
import type { TelemetryFeed } from "../lib/useTelemetryFeed";
import { Card } from "./Card";
import { FeedControls } from "./FeedControls";

/** Satu baris ringkas: kapan record terakhir node diterima backend, dan tegangan baterainya. */
export function LatestTelemetryCard({ feed, now }: { feed: TelemetryFeed; now: Date }) {
  const record = feed.records?.[0];

  return (
    <Card padded={false} className="px-5 py-4 md:px-7">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            Data masuk <span className="font-mono text-xs">{TELEMETRY_NODE_CODE}</span>
          </p>
          <p
            className="text-xs text-ink-muted"
            title={record && formatDateTimeWib(record.receivedAt)}
          >
            {record
              ? `diterima ${formatAgo(record.receivedAt, now)}`
              : feed.records
                ? "belum ada record"
                : feed.error
                  ? "belum dapat dimuat"
                  : "memuat…"}
          </p>
        </div>

        {record && (
          <div>
            <p className="text-xs text-ink-muted">Baterai</p>
            <p className="text-sm font-semibold text-ink tabular-nums">
              {formatBatteryVoltage(record.batteryVoltage)}
            </p>
          </div>
        )}

        <div className="ml-auto">
          <FeedControls feed={feed} />
        </div>
      </div>

      {feed.error && (
        <p role="alert" className="mt-3 text-xs text-danger-ink">
          {describeApiError(feed.error, TELEMETRY_NODE_CODE)}
          {record && " Menampilkan data terakhir yang berhasil dimuat."}
        </p>
      )}
    </Card>
  );
}
