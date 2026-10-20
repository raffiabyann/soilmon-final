import { isOnline } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { BatteryMedium, Download, Droplets, TriangleAlert, WifiOff } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { CardLabel } from "../components/CardLabel";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { SummaryRow } from "../components/SummaryRow";
import { suggestAction } from "../lib/alerts";
import { getMetric } from "../lib/metrics";
import {
  buildNodeReport,
  dailyCompliance,
  HEATMAP_METRICS,
  heatLevel,
  irrigationTotals,
  reportsToCsv,
  type HeatLevel,
  type NodeReport,
} from "../lib/reports";
import { formatClockWib, formatShortDateWib, formatWeekdayWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockIrrigationEvents, mockNodes } from "../mocks/data";
import { mockReadings } from "../mocks/telemetry";

type Range = "24h" | "7d";
const HOURS: Record<Range, number> = { "24h": 24, "7d": 168 };
const RANGE_TEXT: Record<Range, string> = { "24h": "24 jam", "7d": "7 hari" };

/** Warna sel heatmap (komponen Figma "HeatCell"). Penuh/Buruk solid: versi /85 di bawah 4.5:1 untuk teks 12px. */
const HEAT: Record<HeatLevel, string> = {
  Penuh: "bg-ok text-on-accent",
  Baik: "bg-ok/28 text-ink",
  Sebagian: "bg-accent/30 text-ink",
  Buruk: "bg-danger text-on-accent",
  Kosong: "bg-line-soft text-ink-muted",
};

/** Reports (Figma: "Reports · Redesign"): ringkasan per node, heatmap kepatuhan, catatan. */
export function ReportsPage() {
  const [range, setRange] = useState<Range>("7d");
  const since = MOCK_NOW.getTime() - HOURS[range] * 60 * 60 * 1000;
  const readings = mockReadings.filter((r) => new Date(r.recordedAt).getTime() > since);
  const events = mockIrrigationEvents.filter((e) => new Date(e.startedAt).getTime() > since);
  const reports = mockNodes.map((n) => buildNodeReport(readings, n.code));
  const packetTotal = reports.reduce((s, r) => s + r.packetCount, 0);
  const start = new Date(since + 60 * 1000);

  const downloadCsv = () => {
    const blob = new Blob([reportsToCsv(reports)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soilmon-ringkasan-${RANGE_TEXT[range].replace(" ", "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Ringkasan min, rata-rata, dan maks tiap metrik per node, dibandingkan dengan batas normal."
        stat={packetTotal}
        statCaption={`paket · ${mockNodes.length} node · ${RANGE_TEXT[range]}`}
      />

      <Card padded={false} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
        <Segmented
          ariaLabel="Rentang waktu"
          value={range}
          onChange={setRange}
          options={[
            { value: "24h", label: "24 jam" },
            { value: "7d", label: "7 hari" },
          ]}
        />
        <div>
          <p className="font-mono text-[9px] tracking-wider text-ink-muted uppercase">Periode</p>
          <p className="text-sm font-semibold text-ink">
            {formatWeekdayWib(start)} {formatShortDateWib(start)} – {formatWeekdayWib(MOCK_NOW)}{" "}
            {formatShortDateWib(MOCK_NOW)} {MOCK_NOW.getUTCFullYear()}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-band" /> Batas normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-ink-soft/70" /> Rentang min–maks
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-ink bg-surface" /> Rata-rata
          </span>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-on-accent hover:bg-brand-strong pointer-coarse:min-h-11"
        >
          <Download className="size-4" /> Unduh CSV
        </button>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {reports.map((r) => (
          <NodeSummaryCard key={r.nodeCode} report={r} events={events} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <ComplianceHeatmap />
        <WeeklyNotes reports={reports} rangeText={RANGE_TEXT[range]} events={events} />
      </div>
    </div>
  );
}

function NodeSummaryCard({
  report,
  events,
}: {
  report: NodeReport;
  events: typeof mockIrrigationEvents;
}) {
  const node = mockNodes.find((n) => n.code === report.nodeCode);
  const online = node ? isOnline(node.lastSeenAt, MOCK_NOW) : false;
  const pump = irrigationTotals(events, report.nodeCode);
  const good = report.inRangePercent >= 90;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`size-2 rounded-full ${online ? "bg-ok" : "bg-danger"}`} />
        <span className="font-mono text-xs text-ink">{report.nodeCode}</span>
        <h2 className="flex-1 text-lg font-semibold tracking-tight text-ink">{node?.name}</h2>
        {online ? (
          <Badge tone="ok">Online</Badge>
        ) : (
          <Badge tone="danger">
            Offline sejak {node?.lastSeenAt ? formatClockWib(node.lastSeenAt) : "-"}
          </Badge>
        )}
      </div>
      <p className="flex items-baseline gap-2.5">
        <span
          className={`text-[30px] leading-none font-bold tracking-tight ${good ? "text-ink" : "text-danger-ink"}`}
        >
          {report.inRangePercent}%
        </span>
        <span className="text-xs text-ink-muted">
          bacaan dalam batas normal · {report.packetCount} paket
        </span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="label-mono [&>th]:pt-1 [&>th]:pb-1 [&>th]:font-medium">
              <th>Metrik</th>
              <th>Rentang</th>
              <th className="text-right">Min</th>
              <th className="text-right">Rata</th>
              <th className="text-right">Maks</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.metrics.map((m) => (
              <SummaryRow key={m.metricKey} s={m} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 pt-1 text-xs text-ink-soft">
        <Droplets className="size-4 text-water" />
        Pompa {pump.count}× · {pump.liters} L
      </p>
    </Card>
  );
}

function ComplianceHeatmap() {
  const rows = mockNodes.map((n) => ({
    node: n,
    metrics: HEATMAP_METRICS.map((key) => ({
      key,
      days: dailyCompliance(mockReadings, n.code, key, MOCK_NOW),
    })),
  }));
  const header = rows[0]?.metrics[0]?.days ?? [];

  return (
    <Card className="space-y-2.5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Kepatuhan batas normal per hari
        </h2>
        <p className="text-xs text-ink-muted">
          % bacaan harian yang masuk batas normal (7 hari terakhir). Semakin merah, semakin perlu
          dicek.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-x-1.5 border-spacing-y-1.5 text-left">
          <thead>
            <tr>
              <th className="w-[140px]" />
              {header.map((d, i) => (
                <th
                  key={d.dateKey}
                  className={`label-mono text-center font-medium ${i === header.length - 1 ? "text-ink" : ""}`}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, metrics }) => [
              <tr key={`${node.code}-label`}>
                <td colSpan={header.length + 1} className="label-mono pt-2 text-ink-soft">
                  {node.code} · {node.name}
                </td>
              </tr>,
              ...metrics.map((m) => (
                <tr key={`${node.code}-${m.key}`}>
                  <td className="text-sm text-ink">
                    {getMetric(m.key)?.label.replace(" node", "")}
                  </td>
                  {m.days.map((d) => (
                    <td
                      key={d.dateKey}
                      className={`h-8 rounded-lg text-center font-mono text-xs ${HEAT[heatLevel(d.percent)]}`}
                      title={`${d.label}: ${d.percent === null ? "tidak ada data" : `${d.percent}% dalam batas`}`}
                    >
                      {d.percent === null ? "–" : `${d.percent}%`}
                    </td>
                  ))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3.5 pt-1 text-xs text-ink-muted">
        {(
          [
            ["Penuh", "≥ 95%"],
            ["Baik", "80–94%"],
            ["Sebagian", "50–79%"],
            ["Buruk", "< 50%"],
          ] as const
        ).map(([level, text]) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={`size-3.5 rounded ${HEAT[level]}`} /> {text}
          </span>
        ))}
        <span>· hari ini s.d. {formatClockWib(MOCK_NOW)} WIB</span>
      </div>
    </Card>
  );
}

interface Note {
  icon: LucideIcon;
  tone: string;
  title: string;
  text: string;
}

/** Catatan otomatis dari ringkasan: masalah dulu, lalu pompa dan sinyal. */
function WeeklyNotes({
  reports,
  rangeText,
  events,
}: {
  reports: NodeReport[];
  rangeText: string;
  events: typeof mockIrrigationEvents;
}) {
  const notes: Note[] = [];
  for (const r of reports) {
    for (const m of r.metrics) {
      const label = getMetric(m.metricKey)?.label.replace(" node", "") ?? m.metricKey;
      const alert = mockAlerts.find(
        (a) => a.nodeCode === r.nodeCode && a.metricKey === m.metricKey && a.resolvedAt === null,
      );
      const advice = alert ? ` ${suggestAction(alert)}` : "";
      if (m.status === "danger") {
        notes.push({
          icon: TriangleAlert,
          tone: "text-danger-ink",
          title: `${label} ${r.nodeCode} ${m.direction === "low" ? "terus turun" : "terus naik"}`,
          text: `${m.min}–${m.max} selama ${rangeText}, rata-rata ${m.avg} di luar batas.${advice}`,
        });
      } else if (m.status === "warning") {
        notes.push({
          icon: m.metricKey === "battery_percent" ? BatteryMedium : TriangleAlert,
          tone: "text-accent",
          title: `${label} ${r.nodeCode} ${m.direction === "low" ? "menurun" : "naik"}`,
          text: `Dari ${m.first} ke ${m.latest} dalam ${rangeText}.${advice}`,
        });
      }
    }
  }
  const pump = irrigationTotals(events);
  notes.push({
    icon: Droplets,
    tone: "text-water",
    title: pump.count > 0 ? "Pompa bekerja" : "Pompa tidak menyala",
    text:
      pump.count > 0
        ? `${pump.count}× menyala, ${pump.liters} L.`
        : `Tidak ada penyiraman dalam ${rangeText}.`,
  });
  const signals = reports
    .map((r) => ({
      code: r.nodeCode,
      avg: r.metrics.find((m) => m.metricKey === "rssi")?.avg,
    }))
    .filter((s): s is { code: string; avg: number } => s.avg !== undefined)
    .sort((a, b) => a.avg - b.avg);
  const weakest = signals[0];
  if (weakest) {
    const node = mockNodes.find((n) => n.code === weakest.code);
    const offline = node && !isOnline(node.lastSeenAt, MOCK_NOW);
    notes.push({
      icon: WifiOff,
      tone: "text-ink-muted",
      title: `Sinyal ${weakest.code} paling lemah`,
      text: `Rata-rata ${Math.round(weakest.avg)} dBm${offline && node?.lastSeenAt ? `, dan offline sejak ${formatClockWib(node.lastSeenAt)} hari ini` : ""}.`,
    });
  }

  return (
    <Card className="space-y-4">
      <CardLabel>Catatan {rangeText} ini</CardLabel>
      <ul className="space-y-4">
        {notes.map((n) => (
          <li key={n.title} className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-canvas">
              <n.icon className={`size-4 ${n.tone}`} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{n.title}</p>
              <p className="text-xs text-ink-muted">{n.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
