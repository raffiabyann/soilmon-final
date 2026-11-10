import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card } from "./Card";

/**
 * Isi halaman untuk fitur yang belum bisa dibuat. Menjelaskan sebabnya dan menunjuk ke halaman
 * yang sudah berisi data asli.
 */
export function PendingFeature({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="max-w-2xl space-y-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm text-ink-soft">{children}</div>
      <Link
        to="/history"
        className="inline-flex rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-line-soft pointer-coarse:min-h-11 pointer-coarse:items-center"
      >
        Buka Data History
      </Link>
    </Card>
  );
}
