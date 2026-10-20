import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export interface Polled<T> {
  /** null sampai permintaan pertama berhasil. Data lama tetap ada kalau refresh berikutnya gagal. */
  data: T | null;
  /** Error dari permintaan terakhir, null kalau berhasil. */
  error: ApiError | null;
  lastSuccessAt: Date | null;
  loading: boolean;
  refresh: () => void;
}

interface State<T> {
  data: T | null;
  error: ApiError | null;
  lastSuccessAt: Date | null;
  loading: boolean;
}

/**
 * Memanggil `load` berkala. Permintaan berikutnya baru dijadwalkan setelah yang sebelumnya selesai,
 * jadi tidak pernah tumpang-tindih. Saat `key` berubah atau unmount, permintaan dibatalkan.
 */
export function usePolling<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
  intervalMs: number,
): Polled<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    lastSuccessAt: null,
    loading: true,
  });
  const [refreshCount, setRefreshCount] = useState(0);
  // `load` biasanya fungsi baru di tiap render; yang menentukan permintaan ulang adalah `key`.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    let timer: number | undefined;

    async function run() {
      controller = new AbortController();
      setState((s) => ({ ...s, loading: true }));
      try {
        const data = await loadRef.current(controller.signal);
        if (cancelled) return;
        setState({ data, error: null, lastSuccessAt: new Date(), loading: false });
      } catch (err) {
        if (cancelled) return;
        const error =
          err instanceof ApiError
            ? err
            : new ApiError(0, "unexpected_error", "Terjadi kesalahan yang tidak terduga.");
        setState((s) => ({ ...s, error, loading: false }));
      }
      timer = window.setTimeout(run, intervalMs);
    }

    void run();
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearTimeout(timer);
    };
  }, [key, intervalMs, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((n) => n + 1), []);
  return { ...state, refresh };
}
