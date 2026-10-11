import type { MetricKey } from "@soilmon/shared";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RangeGauge } from "../components/RangeGauge";
import { Segmented } from "../components/Segmented";
import { getMetric } from "../lib/metrics";
import { groupPackets } from "../lib/packets";
import { formatClockWib, formatShortDateWib } from "../lib/time";
import { MOCK_NOW, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

const PAGE_SIZE = 10;
const HOUR_MS = 60 * 60 * 1000;

type Range = "24h" | "7d";
type StatusFilter = "all" | "outside";

const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 7 * 24 };
const RANGE_LABEL: Record<Range, string> = { "24h": "24 jam terakhir", "7d": "7 hari terakhir" };

/** Kolom metrik di tabel, urut seperti di Figma. */
const COLUMNS: { key: MetricKey; label: string }[] = [
  { key: "soil_temperature", label: "Suhu tanah" },
  { key: "soil_moisture", label: "Kelembaban" },
  { key: "soil_ph", label: "pH" },
  { key: "battery_percent", label: "Baterai" },
  { key: "rssi", label: "Sinyal LoRa" },
];

const ALL = "all";

/** Data History (Figma: "Data History · Redesign"): satu baris = satu paket dari node. */
export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const nodeParam = params.get("node");
  const nodeFilter = mockNodes.some((n) => n.code === nodeParam) ? (nodeParam ?? ALL) : ALL;
  const [range, setRange] = useState<Range>("24h");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const since = MOCK_NOW.getTime() - RANGE_HOURS[range] * HOUR_MS;
  const packets = groupPackets(
    mockReadings.filter(
      (r) =>
        new Date(r.recordedAt).getTime() > since &&
        (nodeFilter === ALL || r.nodeCode === nodeFilter),
    ),
  ).filter((p) => status === "all" || p.outside.length > 0);

  const readingCount = packets.reduce((sum, p) => sum + Object.keys(p.values).length, 0);
  const totalPages = Math.max(1, Math.ceil(packets.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = packets.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const setNode = (code: string) => {
    setParams(code === ALL ? {} : { node: code });
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Riwayat bacaan sensor"
        title="Data History"
        description="Satu baris = satu paket data dari node (dikirim tiap ±1 jam lewat LoRa)."
        stat={packets.length}
        statCaption={`paket · ${readingCount} bacaan · ${RANGE_LABEL[range].replace(" terakhir", "")}`}
      />

      <Card padded={false} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
        <Segmented
          ariaLabel="Filter node"
          value={nodeFilter}
          onChange={setNode}
          options={[
            { value: ALL, label: "Semua node" },
            ...mockNodes.map((n) => ({ value: n.code, label: n.code })),
          ]}
        />
        <LabeledSelect
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v as StatusFilter);
            setPage(1);
          }}
        >
          <option value="all">Semua paket</option>
          <option value="outside">Ada di luar batas</option>
        </LabeledSelect>
        <LabeledSelect
          label="Rentang"
          value={range}
          onChange={(v) => {
            setRange(v as Range);
            setPage(1);
          }}
        >
          <option value="24h">{RANGE_LABEL["24h"]}</option>
          <option value="7d">{RANGE_LABEL["7d"]}</option>
        </LabeledSelect>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-band" /> Batas normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-ink" /> Nilai
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-danger" /> Di luar batas
          </span>
        </div>
      </Card>

      <Card padded={false} className="overflow-x-auto p-2">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="label-mono [&>th]:bg-canvas [&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
              <th className="rounded-l-xl">Waktu</th>
              <th>Node</th>
              {COLUMNS.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th className="rounded-r-xl text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const node = mockNodes.find((n) => n.code === p.nodeCode);
              const bad = p.outside.length > 0;
              return (
                <tr
                  key={`${p.nodeCode}-${p.recordedAt}`}
                  className={`border-b border-line-soft last:border-0 [&>td]:px-4 [&>td]:py-3 ${bad ? "bg-danger-soft/60" : ""}`}
                >
                  <td>
                    <p className="font-mono text-xs text-ink">{formatClockWib(p.recordedAt)}</p>
                    <p className="text-xs text-ink-muted">{formatShortDateWib(p.recordedAt)}</p>
                  </td>
                  <td>
                    <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-ink">
                      <span className={`size-1.5 rounded-full ${bad ? "bg-danger" : "bg-ok"}`} />
                      {p.nodeCode}
                    </p>
                    <p className="text-xs text-ink-muted">{node?.name}</p>
                  </td>
                  {COLUMNS.map((c) => {
                    const value = p.values[c.key];
                    const metric = getMetric(c.key);
                    const out = p.outside.includes(c.key);
                    const hasRange = metric?.normalMin !== null || metric?.normalMax !== null;
                    return (
                      <td key={c.key}>
                        {value === undefined ? (
                          <span className="text-ink-faint">–</span>
                        ) : (
                          <>
                            <p className={`tabular-nums ${out ? "text-danger" : "text-ink"}`}>
                              {value}
                              {metric?.unit && (
                                <span className="ml-0.5 text-xs text-ink-muted">{metric.unit}</span>
                              )}
                            </p>
                            {hasRange ? (
                              <RangeGauge
                                value={value}
                                metric={metric}
                                className="mt-1.5 w-[84px]"
                              />
                            ) : (
                              <p className="text-xs text-ink-muted">tanpa batas normal</p>
                            )}
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right">
                    {bad ? (
                      <Badge tone="danger">{p.outside.length} di luar batas</Badge>
                    ) : (
                      <Badge tone="ok">Semua normal</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 3}
                  className="py-10 text-center text-sm text-ink-muted"
                >
                  Tidak ada paket untuk filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Pagination
        page={current}
        totalPages={totalPages}
        onChange={setPage}
        summary={
          packets.length === 0
            ? "Tidak ada paket"
            : `Menampilkan ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, packets.length)} dari ${packets.length} paket`
        }
      />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative flex flex-col rounded-xl border border-line px-3.5 py-1.5 focus-within:border-brand">
      <span className="font-mono text-[9px] tracking-wider text-ink-muted uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent pr-6 text-sm font-semibold text-ink outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 bottom-2.5 size-4 text-ink-muted" />
    </label>
  );
}

/** Nomor halaman dengan "…" (contoh: 1 2 3 … 5). */
function pageList(page: number, total: number): (number | "gap")[] {
  const set = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  if (page <= 3) [2, 3].forEach((n) => n <= total && set.add(n));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && n - prev > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function Pagination({
  page,
  totalPages,
  onChange,
  summary,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  summary: string;
}) {
  const btn =
    "grid size-[34px] place-items-center rounded-[10px] border border-line bg-surface text-xs text-ink-soft hover:bg-line-soft disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2">
      <p className="text-xs text-ink-muted">{summary}</p>
      <nav className="flex gap-1.5" aria-label="Halaman">
        <button
          type="button"
          className={btn}
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          aria-label="Sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pageList(page, totalPages).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className={`${btn} pointer-events-none`}>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={
                n === page
                  ? `${btn} border-brand bg-brand font-semibold text-on-accent hover:bg-brand`
                  : btn
              }
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className={btn}
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Berikutnya"
        >
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
