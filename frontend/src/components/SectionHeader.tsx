import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Judul bagian Dashboard. */
export function SectionHeader({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Kontrol di kanan, misalnya pemilih node. */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="label-mono flex items-center gap-2 text-ink">
        <Icon className="size-4" /> {title}
      </h2>
      {children}
    </div>
  );
}
