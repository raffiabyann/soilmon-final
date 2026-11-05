import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

export interface Loaded<T> {
  /** null sampai permintaan berhasil. */
  data: T | null;
  /** Error permintaan terakhir, null kalau berhasil atau masih memuat. */
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

interface State<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

/**
 * Memuat data satu kali setiap `key` berubah (atau `reload` dipanggil). Berbeda dengan usePolling,
 * tidak ada pembaruan berkala, jadi data yang sedang diedit di formulir tidak tertimpa.
 */
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const error =
          err instanceof ApiError
            ? err
            : new ApiError(0, "unexpected_error", "Terjadi kesalahan yang tidak terduga.");
        setState({ data: null, error, loading: false });
      },
    );
    return () => controller.abort();
    // `load` biasanya fungsi baru di tiap render; yang menentukan pemuatan ulang adalah `key`.
  }, [key, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  return { ...state, reload };
}
