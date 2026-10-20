import type { Alert } from "@soilmon/shared";
import { CircleCheck, Sprout, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { alertDirection, suggestAction } from "../lib/alerts";
import { gaugeScale } from "../lib/gauge";
import { getMetric } from "../lib/metrics";
import { dateKeyWib, formatClockWib, formatShortDateWib } from "../lib/time";
import { MOCK_NOW, mockNodes } from "../mocks/data";

interface AlertHeroCardProps {
  alert: Alert;
  onAcknowledge: () => void;
}

/**
 * Kartu merah besar untuk alert terbaru yang belum dibaca (Figma: "AlertHeroCard"):
 * nilai sekarang besar + gauge batas normal, saran, dan tombol "Oke, saya tangani".
 */
export function AlertHeroCard({ alert, onAcknowledge }: AlertHeroCardProps) {
  const metric = getMetric(alert.metricKey);
  const node = mockNodes.find((n) => n.code === alert.nodeCode);
  const value = node?.latest[alert.metricKey] ?? alert.value;
  const direction = alertDirection(alert);
  const label = metric?.label ?? alert.metricKey;
  const since =
    dateKeyWib(alert.triggeredAt) === dateKeyWib(MOCK_NOW)
      ? `${formatClockWib(alert.triggeredAt)} WIB`
      : `${formatShortDateWib(alert.triggeredAt)} ${formatClockWib(alert.triggeredAt)}`;

  const scale = metric ? gaugeScale(metric, value) : null;
  const pct = (v: number) => (scale ? ((v - scale.lo) / (scale.hi - scale.lo)) * 100 : 0);
  const bandStart = metric && scale ? pct(metric.normalMin ?? scale.lo) : 0;
  const bandEnd = metric && scale ? pct(metric.normalMax ?? scale.hi) : 0;

  return (
    <div className="flex h-full flex-col gap-5 rounded-[20px] bg-danger p-6 text-on-accent md:p-8 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-wider uppercase">
          <TriangleAlert className="size-4" />
          Alert baru · sejak {since} · {alert.nodeCode} {node?.name}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-on-accent/20 px-2.5 py-1 text-xs font-semibold">
          <span className="size-1.5 rounded-full bg-on-accent" />
          Belum dibaca
        </span>
      </div>

      <h2 className="text-[28px] leading-tight font-bold tracking-tight">
        {label} {alert.nodeCode} {direction}
      </h2>

      <div className="flex flex-wrap items-center gap-7">
        <p className="flex items-baseline gap-2">
          <span className="text-[44px] leading-none font-bold tracking-tight">{value}</span>
          <span className="text-sm">{metric?.unit ?? label.split(" ")[0]}</span>
        </p>
        {metric && scale && (
          <div className="w-[300px] max-w-full">
            <div className="relative h-3.5">
              <div className="absolute inset-x-0 top-1 h-1.5 rounded-full bg-on-accent/20" />
              <div
                className="absolute top-1 h-1.5 rounded-full bg-on-accent/55"
                style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
              />
              <div
                className="absolute top-0 size-3.5 -translate-x-1/2 rounded-full border-[3px] border-danger bg-on-accent"
                style={{ left: `${pct(value)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-xs">
              <span>{scale.lo}</span>
              <span>
                normal {metric.normalMin ?? "–"}–{metric.normalMax ?? "–"}
              </span>
              <span>{scale.hi}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 rounded-xl bg-on-accent/12 px-4 py-3.5 text-sm">
        <Sprout className="mt-0.5 size-[18px] shrink-0" />
        <p>
          Saran: {suggestAction(alert)}
          {alert.metricKey !== "soil_moisture" &&
            " Pompa tidak bisa memperbaiki ini, jadi alert selesai setelah ditangani orang dan nilainya kembali normal."}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAcknowledge}
          className="inline-flex items-center gap-2 rounded-full bg-on-accent px-[18px] py-2.5 pointer-coarse:py-3.5 text-sm font-semibold text-danger-ink hover:opacity-90"
        >
          <CircleCheck className="size-4" />
          Oke, saya tangani
        </button>
        <Link
          to={`/history?node=${alert.nodeCode}`}
          className="inline-flex items-center rounded-full border border-on-accent/50 px-[18px] py-2.5 pointer-coarse:py-3.5 text-sm font-semibold hover:bg-on-accent/10"
        >
          Lihat di Data History
        </Link>
      </div>
    </div>
  );
}
