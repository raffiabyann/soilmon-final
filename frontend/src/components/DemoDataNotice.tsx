import type { ReactNode } from "react";
import { Badge } from "./Badge";

/** Penanda bahwa bagian halaman memakai data contoh (mock), bukan data API atau sensor. */
export function DemoDataNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-soft">
      <Badge tone="warning">Data contoh</Badge>
      <span>{children}</span>
    </div>
  );
}
