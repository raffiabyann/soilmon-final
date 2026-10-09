import { getMetricStatus, type MetricKey } from "@soilmon/shared";
import { History } from "lucide-react";
import { useState } from "react";
import { Card } from "../components/Card";
import { MetricStatusBadge } from "../components/MetricStatusBadge";
import { formatValue, getMetric } from "../lib/metrics";
import { formatTimeWib } from "../lib/time";
import { mockMetrics, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

const PAGE_SIZE = 20;
const ALL = "all";

const selectClass =
  "rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:border-green-500 focus:outline-none";

export function HistoryPage() {
  const [nodeFilter, setNodeFilter] = useState<string>(ALL);
  const [metricFilter, setMetricFilter] = useState<MetricKey | typeof ALL>(ALL);
  const [page, setPage] = useState(1);

  const filtered = mockReadings.filter(
    (r) =>
      (nodeFilter === ALL || r.nodeCode === nodeFilter) &&
      (metricFilter === ALL || r.metricKey === metricFilter),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-gray-100">
          <History className="size-4" /> Riwayat Pembacaan Sensor
        </h2>
        <div className="flex items-center gap-3">
          <select
            className={selectClass}
            value={nodeFilter}
            onChange={(e) => {
              setNodeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value={ALL}>Semua node</option>
            {mockNodes.map((n) => (
              <option key={n.code} value={n.code}>
                {n.code} · {n.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={metricFilter}
            onChange={(e) => {
              setMetricFilter(e.target.value as MetricKey | typeof ALL);
              setPage(1);
            }}
          >
            <option value={ALL}>Semua metrik</option>
            {mockMetrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{filtered.length} data</span>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
          <tr>
            <th className="py-3">Waktu</th>
            <th>Node</th>
            <th>Metrik</th>
            <th>Nilai</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const metric = getMetric(r.metricKey);
            return (
              <tr
                key={`${r.nodeCode}-${r.metricKey}-${r.recordedAt}`}
                className="border-b border-gray-800/60 hover:bg-gray-800/40"
              >
                <td className="py-3 text-gray-400">{formatTimeWib(r.recordedAt)}</td>
                <td className="font-medium text-gray-100">{r.nodeCode}</td>
                <td>{metric?.label ?? r.metricKey}</td>
                <td>{formatValue(r.value, r.metricKey)}</td>
                <td>
                  <MetricStatusBadge
                    status={metric ? getMetricStatus(r.value, metric) : "unknown"}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-40"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          ← Prev
        </button>
        <span className="text-gray-400">
          Halaman {page} dari {totalPages}
        </span>
        <button
          type="button"
          className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-40"
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next →
        </button>
      </div>
    </Card>
  );
}
