import type { ReactNode } from "react";

export type BadgeTone = "ok" | "danger" | "warning" | "water" | "neutral";

const TONE: Record<BadgeTone, { box: string; dot: string }> = {
  ok: { box: "bg-ok-soft text-ok", dot: "bg-ok" },
  danger: { box: "bg-danger-soft text-danger-ink", dot: "bg-danger" },
  warning: { box: "bg-accent-soft text-accent", dot: "bg-accent" },
  water: { box: "bg-water-soft text-water-ink", dot: "bg-water" },
  neutral: { box: "bg-line-soft text-ink-muted", dot: "bg-ink-faint" },
};

/**
 * Label berwarna (komponen Figma "Badge"). Warna selalu ditemani teks.
 * `dot` hanya untuk status yang sedang berlangsung, misalnya koneksi ke backend.
 */
export function Badge({
  tone,
  dot = false,
  children,
}: {
  tone: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  const style = TONE[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style.box}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${style.dot}`} />}
      {children}
    </span>
  );
}
