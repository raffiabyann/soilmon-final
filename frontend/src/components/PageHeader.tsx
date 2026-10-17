import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Angka besar di kanan, misalnya "46". */
  stat?: ReactNode;
  statCaption?: string;
}

/** Judul halaman (Figma: "Page header"): label mono, judul 28 bold, keterangan, angka kanan. */
export function PageHeader({ eyebrow, title, description, stat, statCaption }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label-mono">{eyebrow}</p>
        <h1 className="mt-1.5 text-[28px] leading-tight font-bold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      {stat !== undefined && (
        <p className="flex items-baseline gap-2">
          <span className="text-[28px] leading-none font-bold tracking-tight text-ink">{stat}</span>
          {statCaption && <span className="text-xs text-ink-muted">{statCaption}</span>}
        </p>
      )}
    </div>
  );
}
