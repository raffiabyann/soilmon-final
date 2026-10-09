import { getMetricStatus, type Metric } from "@soilmon/shared";

interface RangeGaugeProps {
  value: number;
  metric: Metric | undefined;
}

interface Scale {
  lo: number;
  hi: number;
}

/**
 * Rentang sumbu gauge:
 * - satuan % → 0 sampai 100 (seperti bar CPU/Memory di referensi);
 * - punya batas bawah & atas → batas normal diperlebar 50% ke kiri dan kanan;
 * - selain itu tidak digambar (belum ada batas normal untuk dibandingkan).
 */
function scaleFor(metric: Metric): Scale | null {
  if (metric.unit === "%") {
    return { lo: 0, hi: 100 };
  }
  if (metric.normalMin !== null && metric.normalMax !== null) {
    const pad = (metric.normalMax - metric.normalMin) * 0.5;
    return { lo: metric.normalMin - pad, hi: metric.normalMax + pad };
  }
  return null;
}

function toPercent(v: number, s: Scale): number {
  return Math.min(100, Math.max(0, ((v - s.lo) / (s.hi - s.lo)) * 100));
}

/**
 * Bar kecil di tabel (referensi "servers table" 21st.dev), versi SoilMon:
 * pita hijau = batas normal, titik = nilai bacaan. Titik merah kalau di luar batas.
 */
export function RangeGauge({ value, metric }: RangeGaugeProps) {
  const scale = metric ? scaleFor(metric) : null;
  if (!metric || !scale) {
    return <span className="text-xs text-ink-muted">–</span>;
  }
  const bandStart = toPercent(metric.normalMin ?? scale.lo, scale);
  const bandEnd = toPercent(metric.normalMax ?? scale.hi, scale);
  const position = toPercent(value, scale);
  const status = getMetricStatus(value, metric);
  const outside = status === "low" || status === "high";

  return (
    <div
      className="relative h-1.5 w-28 rounded-full bg-stone-100"
      title={`Normal ${metric.normalMin ?? "-"} – ${metric.normalMax ?? "-"}`}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-green-200"
        style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
      />
      <div
        className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface ${
          outside ? "bg-red-600" : "bg-ink"
        }`}
        style={{ left: `${position}%` }}
      />
    </div>
  );
}
