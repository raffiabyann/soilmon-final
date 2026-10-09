import { getMetricStatus } from "@soilmon/shared";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChartBar } from "lucide-react";
import { Card } from "../components/Card";
import { MetricStatusBadge } from "../components/MetricStatusBadge";
import { formatValue, getMetric } from "../lib/metrics";
import { REPORT_METRICS, summarizeNode, type MetricSummary } from "../lib/reports";
import { mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

const TREND_ICON = {
  up: <ArrowUpRight className="size-4 text-stone-600" />,
  down: <ArrowDownRight className="size-4 text-stone-600" />,
  flat: <ArrowRight className="size-4 text-ink-muted" />,
} as const;

const summaries = mockNodes.map((node) => ({
  node,
  metrics: summarizeNode(mockReadings, node.code),
}));

function SummaryRow({ s }: { s: MetricSummary }) {
  return (
    <tr className="border-b border-line/70 last:border-0">
      <td className="py-3 text-stone-600">{getMetric(s.metricKey)?.label ?? s.metricKey}</td>
      <td className="text-ink-muted">{formatValue(s.min, s.metricKey)}</td>
      <td className="font-semibold text-ink">{formatValue(s.avg, s.metricKey)}</td>
      <td className="text-ink-muted">{formatValue(s.max, s.metricKey)}</td>
      <td>{TREND_ICON[s.trend]}</td>
    </tr>
  );
}

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">Ringkasan 24 jam terakhir dari data contoh.</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {summaries.map(({ node, metrics }) => (
          <Card key={node.code}>
            <p className="font-semibold text-ink">{node.code}</p>
            <p className="mb-3 text-xs text-ink-muted">{node.name}</p>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-ink-muted">
                <tr>
                  <th className="py-2">Metrik</th>
                  <th>Min</th>
                  <th>Rata-rata</th>
                  <th>Max</th>
                  <th>Tren</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((s) => (
                  <SummaryRow key={s.metricKey} s={s} />
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>

      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <ChartBar className="size-4" /> Perbandingan Antar Node
        <span className="text-xs font-normal text-ink-muted">nilai terbaru, tertinggi di atas</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_METRICS.map((key) => {
          const metric = getMetric(key);
          // Nilai terbaru diambil dari data node (sama dengan kartu di Dashboard).
          const ranked = mockNodes
            .flatMap((node) => {
              const latest = node.latest[key];
              return latest === undefined ? [] : [{ node, latest }];
            })
            .sort((a, b) => b.latest - a.latest);
          const highest = ranked[0]?.latest ?? 0;
          const lowest = ranked[ranked.length - 1]?.latest ?? 0;
          // Panjang bar relatif terhadap nilai terendah-tertinggi, supaya juga benar
          // untuk nilai negatif seperti sinyal (-71 dBm lebih kuat dari -86 dBm).
          const barWidth = (value: number) =>
            highest === lowest ? 100 : 15 + (85 * (value - lowest)) / (highest - lowest);

          return (
            <Card key={key}>
              <p className="mb-3 text-sm font-semibold text-ink">{metric?.label ?? key}</p>
              <ul className="space-y-3">
                {ranked.map((r, i) => (
                  <li key={r.node.code} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-ink-muted">{i + 1}</span>
                    <span className="w-10 font-medium text-ink">{r.node.code}</span>
                    <div className="h-2 flex-1 rounded-full bg-stone-100">
                      <div
                        className="h-2 rounded-full bg-brand"
                        style={{ width: `${barWidth(r.latest)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-ink">{formatValue(r.latest, key)}</span>
                    <MetricStatusBadge
                      status={metric ? getMetricStatus(r.latest, metric) : "unknown"}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
