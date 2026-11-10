import { describeApiError, describeErrorDetails, type ApiError } from "../lib/api";
import { Card } from "./Card";

/** Kotak pesan untuk kegagalan memuat (503, backend mati, 403, dan lainnya). Halaman tidak pernah kosong. */
export function LoadError({
  error,
  nodeCode,
  onRetry,
}: {
  error: ApiError;
  nodeCode: string;
  onRetry: () => void;
}) {
  const details = describeErrorDetails(error);
  return (
    <Card>
      <p role="alert" className="text-sm text-danger-ink">
        {error.code === "forbidden" ? error.message : describeApiError(error, nodeCode)}
      </p>
      {details.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs text-danger-ink">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-line-soft pointer-coarse:min-h-11"
      >
        Coba lagi
      </button>
    </Card>
  );
}
