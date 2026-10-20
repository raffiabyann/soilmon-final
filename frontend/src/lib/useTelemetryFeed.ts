import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchNodeTelemetry, type TelemetryRecord } from "./api";

export interface TelemetryFeed {
  /** null sampai permintaan pertama berhasil. Data lama tetap ada kalau refresh berikutnya gagal. */
  records: TelemetryRecord[] | null;
  /** Error dari permintaan terakhir, null kalau berhasil. */
  error: ApiError | null;
  lastSuccessAt: Date | null;
  loading: boolean;
  refresh: () => void;
}

interface FeedState {
  records: TelemetryRecord[] | null;
  error: ApiError | null;
  lastSuccessAt: Date | null;
  loading: boolean;
}

/**
 * Mengambil telemetry node secara berkala. Permintaan berikutnya baru dijadwalkan setelah yang
 * sebelumnya selesai, jadi tidak pernah tumpang-tindih. Saat unmount, permintaan dibatalkan.
 */
export function useTelemetryFeed(
  nodeCode: string,
  limit: number,
  intervalMs: number,
): TelemetryFeed {
  const [state, setState] = useState<FeedState>({
    records: null,
    error: null,
    lastSuccessAt: null,
    loading: true,
  });
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    let timer: number | undefined;

    async function load() {
      controller = new AbortController();
      setState((s) => ({ ...s, loading: true }));
      try {
        const records = await fetchNodeTelemetry(nodeCode, { limit, signal: controller.signal });
        if (cancelled) return;
        setState({ records, error: null, lastSuccessAt: new Date(), loading: false });
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof ApiError
            ? err
            : new ApiError(0, "unexpected_error", "Terjadi kesalahan yang tidak terduga.");
        setState((s) => ({ ...s, error, loading: false }));
      }
      timer = window.setTimeout(load, intervalMs);
    }

    void load();
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearTimeout(timer);
    };
  }, [nodeCode, limit, intervalMs, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((n) => n + 1), []);
  return { ...state, refresh };
}
