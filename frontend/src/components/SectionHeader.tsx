import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./Badge";

/** Judul bagian Dashboard. `mock` menambah label "Data contoh" untuk isi yang belum dari API. */
export function SectionHeader({
  icon: Icon,
  title,
  mock = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  mock?: boolean;
  /** Kontrol di kanan, misalnya pemilih node. */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 className="label-mono flex items-center gap-2 text-ink">
          <Icon className="size-4" /> {title}
        </h2>
        {mock && <Badge tone="warning">Data contoh</Badge>}
      </div>
      {children}
    </div>
  );
}
