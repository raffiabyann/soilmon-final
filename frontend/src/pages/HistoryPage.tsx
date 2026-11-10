import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Card } from "../components/Card";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { TextField } from "../components/TextField";
import {
  ApiError,
  describeApiError,
  fetchNodeTelemetry,
  fetchNodes,
  type ApiNode,
  type TelemetryRecord,
} from "../lib/api";
import { formatDateTimeWib, wibInputToIso } from "../lib/time";
import { useLoad } from "../lib/useLoad";

/** Paket per permintaan. Batas backend 500; 50 adalah nilai bawaannya. */
const PAGE_LIMIT = 50;
const REGISTER_COUNT = 7;
const REGISTER_LABELS = Array.from({ length: REGISTER_COUNT }, (_, i) => `R${i + 1}`);

/** Data History: satu baris = satu paket telemetry dari node, dibaca dari backend. */
export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");

  // GET /nodes hanya berisi node yang boleh dibaca pengguna ini; admin mendapat semuanya.
  const nodes = useLoad(fetchNodes, "nodes");
  const list = nodes.data ?? [];
  const requested = params.get("node");
  const node = list.find((n) => n.code === requested) ?? list[0] ?? null;

  const from = wibInputToIso(fromText);
  const to = wibInputToIso(toText);
  const reversed = from !== null && to !== null && from >= to;
  const filtered = fromText !== "" || toText !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data History"
        description="Satu baris = satu paket data dari node, terbaru di atas."
      />

      {nodes.error ? (
        <LoadError error={nodes.error} nodeCode="" onRetry={nodes.reload} />
      ) : nodes.loading ? (
        <Card>
          <p role="status" className="text-sm text-ink-muted">
            Memuat daftar node…
          </p>
        </Card>
      ) : node === null ? (
        <Card>
          <p className="text-sm text-ink-muted">Belum ada node yang bisa Anda akses.</p>
        </Card>
      ) : (
        <>
          <Card padded={false} className="space-y-4 px-4 py-4">
            <Segmented
              ariaLabel="Pilih node"
              value={node.code}
              onChange={(code) => setParams({ node: code })}
              options={list.map((n) => ({ value: n.code, label: n.code }))}
            />
            <div className="flex flex-wrap items-end gap-4">
              <TextField
                className="min-w-0 flex-1 basis-56"
                label="Dari (WIB)"
                type="datetime-local"
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
                error={reversed ? "Harus lebih awal dari waktu Sampai." : undefined}
              />
              <TextField
                className="min-w-0 flex-1 basis-56"
                label="Sampai (WIB)"
                type="datetime-local"
                value={toText}
                onChange={(e) => setToText(e.target.value)}
                hint="Paket pada menit ini tidak ikut."
              />
              <button
                type="button"
                disabled={!filtered}
                onClick={() => {
                  setFromText("");
                  setToText("");
                }}
                className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink-soft hover:bg-line-soft disabled:opacity-40 pointer-coarse:min-h-11"
              >
                Hapus rentang
              </button>
            </div>
          </Card>

          <p
            role="note"
            className="flex items-start gap-2 rounded-xl bg-line-soft px-4 py-2.5 text-sm text-ink-soft"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              R1 sampai R7 adalah register mentah dari node (bilangan bulat 0 sampai 65535) dan
              belum dikalibrasi. Arti, skala, dan satuan register belum diverifikasi, jadi nilainya
              tidak diubah menjadi suhu, kelembapan, atau pH.
            </span>
          </p>

          {reversed ? (
            <Card>
              <p role="alert" className="text-sm text-danger-ink">
                Rentang waktu terbalik. Ubah Dari atau Sampai agar riwayat bisa dimuat.
              </p>
            </Card>
          ) : (
            <HistoryResults
              key={`${node.code}|${from ?? ""}|${to ?? ""}`}
              node={node}
              from={from}
              to={to}
              onClearRange={
                filtered
                  ? () => {
                      setFromText("");
                      setToText("");
                    }
                  : null
              }
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Halaman pertama dimuat lewat useLoad. "Muat lebih lama" meminta halaman berikutnya dengan `to`
 * tepat setelah paket paling lama yang sudah tampil, karena backend tidak punya kursor.
 * Komponen ini dipasang ulang (key) setiap node atau rentang berubah, jadi daftarnya mulai dari nol.
 */
function HistoryResults({
  node,
  from,
  to,
  onClearRange,
}: {
  node: ApiNode;
  from: string | null;
  to: string | null;
  onClearRange: (() => void) | null;
}) {
  const nodeCode = node.code;
  const first = useLoad(
    (signal) =>
      fetchNodeTelemetry(nodeCode, {
        limit: PAGE_LIMIT,
        from: from ?? undefined,
        to: to ?? undefined,
        signal,
      }),
    "first",
  );
  const [older, setOlder] = useState<{ records: TelemetryRecord[]; lastCount: number | null }>({
    records: [],
    lastCount: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<ApiError | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  if (first.error) {
    return <LoadError error={first.error} nodeCode={nodeCode} onRetry={first.reload} />;
  }
  if (first.data === null) {
    return (
      <Card>
        <p role="status" className="text-sm text-ink-muted">
          Memuat riwayat {nodeCode}…
        </p>
      </Card>
    );
  }

  const records = [...first.data, ...older.records];
  // Halaman yang tidak penuh berarti sudah sampai paket paling lama.
  const hasMore = (older.lastCount ?? first.data.length) === PAGE_LIMIT;

  async function loadMore() {
    const oldest = records[records.length - 1];
    if (!oldest || loadingMore) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoadingMore(true);
    setMoreError(null);
    try {
      // `to` tidak termasuk, dan ISO hanya sampai milidetik sedangkan database menyimpan
      // mikrodetik. Tambah 1 ms supaya paket sesama milidetik tidak terlewat; duplikat dibuang lewat id.
      const before = new Date(new Date(oldest.receivedAt).getTime() + 1).toISOString();
      const page = await fetchNodeTelemetry(nodeCode, {
        limit: PAGE_LIMIT,
        from: from ?? undefined,
        to: before,
        signal: controller.signal,
      });
      const seen = new Set(records.map((r) => r.id));
      const fresh = page.filter((r) => !seen.has(r.id));
      // Tanpa paket baru, anggap habis supaya tombol tidak berputar di tempat.
      setOlder((prev) => ({
        records: [...prev.records, ...fresh],
        lastCount: fresh.length === 0 ? 0 : page.length,
      }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setMoreError(
        err instanceof ApiError
          ? err
          : new ApiError(0, "unexpected_error", "Terjadi kesalahan yang tidak terduga."),
      );
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  if (records.length === 0) {
    return (
      <Card>
        {onClearRange ? (
          <>
            <p className="text-sm text-ink-muted">
              Tidak ada paket dari {nodeCode} pada rentang waktu ini.
              {node.lastReceivedAt &&
                ` Paket terakhir node ini diterima ${formatDateTimeWib(node.lastReceivedAt)}.`}
            </p>
            <button
              type="button"
              onClick={onClearRange}
              className="mt-4 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-line-soft pointer-coarse:min-h-11"
            >
              Hapus rentang waktu
            </button>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            Node {nodeCode} belum mengirim paket data. Paket muncul di sini setelah gateway
            mengirimnya ke backend.
          </p>
        )}
      </Card>
    );
  }

  return (
    <>
      <Card padded={false} className="overflow-x-auto p-2">
        <table className="w-full min-w-[920px] text-left text-sm">
          <caption className="sr-only">
            Paket telemetry node {nodeCode}, terbaru di atas. R1 sampai R7 adalah register mentah.
          </caption>
          <thead>
            <tr className="label-mono [&>th]:bg-canvas [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
              <th scope="col" className="sticky left-0 rounded-l-xl">
                Waktu diterima
              </th>
              <th scope="col">Waktu ukur</th>
              <th scope="col" className="text-right">
                Baterai (V)
              </th>
              {REGISTER_LABELS.map((label, i) => (
                <th
                  key={label}
                  scope="col"
                  className={`text-right ${i === REGISTER_COUNT - 1 ? "rounded-r-xl" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                className="border-b border-line-soft last:border-0 [&>td]:px-4 [&>td]:py-3"
              >
                <td className="sticky left-0 bg-surface font-mono text-xs whitespace-nowrap text-ink">
                  {formatDateTimeWib(r.receivedAt)}
                </td>
                <td className="font-mono text-xs whitespace-nowrap text-ink">
                  {r.measuredAt === null ? <Missing /> : formatDateTimeWib(r.measuredAt)}
                </td>
                <td className="text-right font-mono text-xs tabular-nums text-ink">
                  {r.batteryVoltage === null ? <Missing /> : r.batteryVoltage}
                </td>
                {REGISTER_LABELS.map((label, i) => (
                  <td key={label} className="text-right font-mono text-xs tabular-nums text-ink">
                    {r.rawRegisters[i] === undefined ? <Missing /> : r.rawRegisters[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        <p className="text-xs text-ink-muted">
          {hasMore
            ? `Menampilkan ${records.length} paket, terbaru di atas.`
            : `Semua ${records.length} paket pada rentang ini sudah ditampilkan.`}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
            className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-line-soft disabled:opacity-50 pointer-coarse:min-h-11"
          >
            {loadingMore ? "Memuat…" : `Muat ${PAGE_LIMIT} paket lebih lama`}
          </button>
        )}
      </div>
      {moreError && (
        <p role="alert" className="px-2 text-xs text-danger-ink">
          {describeApiError(moreError, nodeCode)} Tekan tombol untuk mencoba lagi.
        </p>
      )}
    </>
  );
}

/** Sel tanpa nilai: "-" untuk mata, dan teks untuk pembaca layar. */
function Missing() {
  return (
    <>
      <span aria-hidden>-</span>
      <span className="sr-only">tidak ada</span>
    </>
  );
}
