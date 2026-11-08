import { Lock, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { TextField } from "../components/TextField";
import {
  ApiError,
  describeApiError,
  describeErrorDetails,
  fetchNodeConfig,
  fetchNodes,
  patchNodeConfig,
  type NodeConfig,
  type NodeConfigChanges,
} from "../lib/api";
import { useAuthState } from "../lib/auth";
import { formatDateTimeWib } from "../lib/time";
import { useLoad } from "../lib/useLoad";

/**
 * Settings: konfigurasi per node, diisi dari GET /nodes/{node}/config.
 * Admin bisa mengubah dan menyimpan (PATCH). Viewer melihat nilai yang sama dengan kolom nonaktif.
 *
 * Kolom nonaktif hanya agar pengguna tidak mengetik lalu bingung kenapa tidak tersimpan. Itu BUKAN
 * pengamanan: yang menolak PATCH dari viewer adalah backend (403), dan jawabannya ditampilkan.
 */
export function SettingsPage() {
  const { session } = useAuthState();
  const canEdit = session?.role === "admin";
  const [params, setParams] = useSearchParams();

  // GET /nodes hanya berisi node yang boleh dibaca pengguna ini; admin mendapat semuanya.
  const nodes = useLoad(fetchNodes, "nodes");
  const codes = nodes.data?.map((n) => n.code) ?? [];
  const requested = params.get("node");
  const nodeCode = requested !== null && codes.includes(requested) ? requested : (codes[0] ?? null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Konfigurasi per node. Nilai ini baru disimpan; belum ada logika pompa yang membacanya."
      />

      {nodes.error ? (
        <LoadError error={nodes.error} nodeCode="" onRetry={nodes.reload} />
      ) : nodes.loading ? (
        <Card>
          <p role="status" className="text-sm text-ink-muted">
            Memuat daftar node…
          </p>
        </Card>
      ) : nodeCode === null ? (
        <Card>
          <p className="text-sm text-ink-muted">Belum ada node yang bisa Anda akses.</p>
        </Card>
      ) : (
        <>
          {codes.length > 1 && (
            <Segmented
              ariaLabel="Pilih node"
              value={nodeCode}
              onChange={(code) => setParams({ node: code })}
              options={codes.map((code) => ({ value: code, label: code }))}
            />
          )}
          <NodeConfigPanel key={nodeCode} nodeCode={nodeCode} canEdit={canEdit} />
        </>
      )}
    </div>
  );
}

function NodeConfigPanel({ nodeCode, canEdit }: { nodeCode: string; canEdit: boolean }) {
  const config = useLoad((signal) => fetchNodeConfig(nodeCode, signal), nodeCode);

  if (config.error)
    return <LoadError error={config.error} nodeCode={nodeCode} onRetry={config.reload} />;
  if (config.data === null) {
    return (
      <Card>
        <p role="status" className="text-sm text-ink-muted">
          Memuat konfigurasi {nodeCode}…
        </p>
      </Card>
    );
  }
  return <ConfigForm initial={config.data} canEdit={canEdit} />;
}

/** Kotak pesan untuk kegagalan memuat (503, backend mati, 403, dan lainnya). Halaman tidak pernah kosong. */
function LoadError({
  error,
  nodeCode,
  onRetry,
}: {
  error: ApiError;
  nodeCode: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <p role="alert" className="text-sm text-danger-ink">
        {error.code === "forbidden" ? error.message : describeApiError(error, nodeCode)}
      </p>
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

const toText = (value: number | null) => (value === null ? "" : String(value));

/** "" berarti dikosongkan (null). Mengembalikan undefined kalau bukan angka. */
function parseField(text: string): number | null | undefined {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

type Feedback = { kind: "saved" } | { kind: "unchanged" } | { kind: "error"; error: ApiError };

function ConfigForm({ initial, canEdit }: { initial: NodeConfig; canEdit: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [moisture, setMoisture] = useState(toText(initial.moistureThreshold));
  const [pump, setPump] = useState(toText(initial.pumpDurationSec));
  const [fieldErrors, setFieldErrors] = useState<{ moisture?: string; pump?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFeedback(null);

    const moistureValue = parseField(moisture);
    const pumpValue = parseField(pump);
    const errors: { moisture?: string; pump?: string } = {};
    if (moistureValue === undefined) errors.moisture = "Isi dengan angka.";
    if (pumpValue === undefined) errors.pump = "Isi dengan angka.";
    setFieldErrors(errors);
    if (moistureValue === undefined || pumpValue === undefined) return;

    // Hanya field yang berubah yang dikirim; null mengosongkan nilai di backend.
    const changes: NodeConfigChanges = {};
    if (moistureValue !== saved.moistureThreshold) changes.moistureThreshold = moistureValue;
    if (pumpValue !== saved.pumpDurationSec) changes.pumpDurationSec = pumpValue;
    if (Object.keys(changes).length === 0) {
      setFeedback({ kind: "unchanged" });
      return;
    }

    setSubmitting(true);
    try {
      const next = await patchNodeConfig(saved.nodeCode, changes);
      setSaved(next);
      setMoisture(toText(next.moistureThreshold));
      setPump(toText(next.pumpDurationSec));
      setFeedback({ kind: "saved" });
    } catch (err) {
      const error =
        err instanceof ApiError
          ? err
          : new ApiError(0, "unexpected_error", "Terjadi kesalahan yang tidak terduga.");
      setFeedback({ kind: "error", error });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="label-mono text-ink">Node {saved.nodeCode}</h2>
          <p className="text-xs text-ink-muted">
            {saved.updatedAt
              ? `Terakhir diubah ${formatDateTimeWib(saved.updatedAt)}`
              : "Belum pernah diatur"}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Ambang kelembapan"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={moisture}
            onChange={(e) => setMoisture(e.target.value)}
            disabled={!canEdit || submitting}
            error={fieldErrors.moisture}
            hint="Satuan belum ditetapkan. Kosongkan untuk menghapus nilai."
          />
          <TextField
            label="Durasi pompa (detik)"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            value={pump}
            onChange={(e) => setPump(e.target.value)}
            disabled={!canEdit || submitting}
            error={fieldErrors.pump}
            hint="Bilangan bulat, minimal 1. Kosongkan untuk menghapus nilai."
          />
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-xs font-semibold text-on-accent hover:bg-brand-strong disabled:opacity-50 pointer-coarse:min-h-11"
            >
              <Save className="size-4" />
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
            <FeedbackMessage feedback={feedback} nodeCode={saved.nodeCode} />
          </div>
        ) : (
          <p
            role="note"
            className="flex items-center gap-2 rounded-xl bg-line-soft px-4 py-2.5 text-sm text-ink-soft"
          >
            <Lock className="size-4 shrink-0" aria-hidden />
            Akses Anda hanya untuk memantau.
          </p>
        )}
      </form>
    </Card>
  );
}

function FeedbackMessage({ feedback, nodeCode }: { feedback: Feedback | null; nodeCode: string }) {
  if (feedback === null) return null;
  if (feedback.kind === "saved") {
    return (
      <p role="status" className="text-xs text-ok">
        Tersimpan.
      </p>
    );
  }
  if (feedback.kind === "unchanged") {
    return (
      <p role="status" className="text-xs text-ink-muted">
        Tidak ada perubahan untuk disimpan.
      </p>
    );
  }
  const { error } = feedback;
  const details = describeErrorDetails(error);
  // 403 dan 422: tampilkan pesan dari backend, bukan teks generik.
  const text =
    error.code === "forbidden" || error.status === 403 || error.code === "validation_failed"
      ? `Ditolak backend: ${error.message}`
      : describeApiError(error, nodeCode);
  return (
    <div role="alert" className="text-xs text-danger-ink">
      <p>{text}</p>
      {details.length > 0 && (
        <ul className="mt-1 list-disc pl-4">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
