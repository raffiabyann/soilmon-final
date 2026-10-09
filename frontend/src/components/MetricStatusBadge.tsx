import type { MetricStatus } from "@soilmon/shared";

const STYLE: Record<MetricStatus, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-green-50 text-green-700" },
  low: { label: "Rendah", className: "bg-red-50 text-red-700" },
  high: { label: "Tinggi", className: "bg-red-50 text-red-700" },
  unknown: { label: "-", className: "bg-stone-100 text-ink-muted" },
};

export function MetricStatusBadge({ status }: { status: MetricStatus }) {
  const style = STYLE[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
