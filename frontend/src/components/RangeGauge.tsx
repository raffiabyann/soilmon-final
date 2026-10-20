import { getMetricStatus, type Metric } from "@soilmon/shared";
import { gaugeScale, type GaugeScale } from "../lib/gauge";

interface RangeGaugeProps {
  value: number;
  metric: Metric | undefined;
  className?: string;
}

function toPercent(v: number, s: GaugeScale): number {
  return Math.min(100, Math.max(0, ((v - s.lo) / (s.hi - s.lo)) * 100));
}

/** Bar kecil di tabel: pita = batas normal, titik = nilai bacaan. Titik merah kalau di luar batas. */
export function RangeGauge({ value, metric, className = "w-[84px]" }: RangeGaugeProps) {
  const scale = metric ? gaugeScale(metric) : null;
  if (!metric || !scale) {
    return null;
  }
  const bandStart = toPercent(metric.normalMin ?? scale.lo, scale);
  const bandEnd = toPercent(metric.normalMax ?? scale.hi, scale);
  const position = toPercent(value, scale);
  const status = getMetricStatus(value, metric);
  const outside = status === "low" || status === "high";

  return (
    <div
      className={`relative h-1 rounded-full bg-line-soft ${className}`}
      title={`Normal ${metric.normalMin ?? "-"} – ${metric.normalMax ?? "-"}`}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-band"
        style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
      />
      <div
        className={`absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${
          outside ? "bg-danger" : "bg-ink"
        }`}
        style={{ left: `${position}%` }}
      />
    </div>
  );
}
