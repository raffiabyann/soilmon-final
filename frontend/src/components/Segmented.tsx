import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Angka kecil di samping label, misalnya jumlah alert. */
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** Pilihan berbentuk pil (filter node, status alert, rentang waktu). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex shrink-0 gap-1 rounded-full bg-line-soft p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap transition-colors ${
              active
                ? "bg-surface font-semibold text-ink shadow-card"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`font-mono ${active ? "text-ink-soft" : "text-ink-faint"}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
