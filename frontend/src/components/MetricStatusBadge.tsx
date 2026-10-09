import type { MetricStatus } from "@soilmon/shared";

const STYLE: Record<MetricStatus, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-green-500/15 text-green-400" },
  low: { label: "Rendah", className: "bg-red-500/15 text-red-400" },
  high: { label: "Tinggi", className: "bg-red-500/15 text-red-400" },
  unknown: { label: "-", className: "bg-gray-800 text-gray-400" },
};

export function MetricStatusBadge({ status }: { status: MetricStatus }) {
  const style = STYLE[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}
