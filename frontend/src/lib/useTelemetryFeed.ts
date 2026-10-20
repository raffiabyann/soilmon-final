import { fetchNodeTelemetry, type TelemetryRecord } from "./api";
import { usePolling, type Polled } from "./usePolling";

export interface TelemetryFeed extends Omit<Polled<TelemetryRecord[]>, "data"> {
  /** null sampai permintaan pertama berhasil. Data lama tetap ada kalau refresh berikutnya gagal. */
  records: TelemetryRecord[] | null;
}

/** Telemetry terbaru satu node, diambil berkala dari API backend. */
export function useTelemetryFeed(
  nodeCode: string,
  limit: number,
  intervalMs: number,
): TelemetryFeed {
  const { data, ...rest } = usePolling(
    (signal) => fetchNodeTelemetry(nodeCode, { limit, signal }),
    `${nodeCode}:${limit}`,
    intervalMs,
  );
  return { ...rest, records: data };
}
