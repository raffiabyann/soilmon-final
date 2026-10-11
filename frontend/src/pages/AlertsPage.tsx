import type { Alert } from "@soilmon/shared";
import { Bell, Droplets } from "lucide-react";
import { useState } from "react";
import { AlertHeroCard } from "../components/AlertHeroCard";
import { AlertItem } from "../components/AlertItem";
import { Card } from "../components/Card";
import { CardLabel } from "../components/CardLabel";
import { formatShortDateWib, formatTimeWib } from "../lib/time";
import { mockAlerts, mockIrrigationEvents } from "../mocks/data";

type AlertFilter = "all" | "active" | "resolved";

const FILTERS: { value: AlertFilter; label: string; match: (a: Alert) => boolean }[] = [
  { value: "all", label: "Semua", match: () => true },
  { value: "active", label: "Aktif", match: (a) => a.resolvedAt === null },
  { value: "resolved", label: "Selesai", match: (a) => a.resolvedAt !== null },
];

export function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>("all");
  /**
   * Alert yang ditandai dibaca di sesi ini. Hanya di memori: hilang saat halaman dimuat ulang.
   * Nanti (F6) tombolnya memanggil API acknowledge dan data diambil ulang dari backend.
   */
  const [ackedIds, setAckedIds] = useState<ReadonlySet<number>>(new Set());

  const isAcked = (a: Alert) => a.acknowledgedAt !== null || ackedIds.has(a.id);
  const acknowledge = (id: number) => setAckedIds((prev) => new Set(prev).add(id));

  const current = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const shown = current ? mockAlerts.filter(current.match) : mockAlerts;
  const unread = mockAlerts.filter((a) => a.resolvedAt === null && !isAcked(a));
  const [heroAlert] = unread;
  const maxLiters = Math.max(...mockIrrigationEvents.map((e) => e.volumeLiters), 0);

  return (
    <div className="space-y-6">
      {heroAlert && (
        <AlertHeroCard
          alert={heroAlert}
          othersCount={unread.length - 1}
          onAcknowledge={() => acknowledge(heroAlert.id)}
        />
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardLabel>
            <Bell className="size-3.5" /> Riwayat alert
          </CardLabel>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  filter === f.value
                    ? "border-brand bg-brand text-white"
                    : "border-line text-ink-muted hover:bg-canvas"
                }`}
              >
                {f.label}{" "}
                <span className="ml-1 opacity-70">{mockAlerts.filter(f.match).length}</span>
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Tidak ada alert.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                acknowledged={isAcked(alert)}
                onAcknowledge={() => acknowledge(alert.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardLabel>
          <Droplets className="size-3.5" /> Riwayat penyiraman
        </CardLabel>
        <p className="mt-1 mb-3 text-xs text-ink-muted">
          Pompa di node menyala otomatis saat tanah kering. Volume adalah perkiraan (debit ×
          durasi).
        </p>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-ink-muted">
            <tr>
              <th className="py-3 font-medium">Waktu</th>
              <th className="font-medium">Node</th>
              <th className="font-medium">Pemicu</th>
              <th className="text-right font-medium">Durasi</th>
              <th className="pl-8 font-medium">Volume (perkiraan)</th>
            </tr>
          </thead>
          <tbody>
            {mockIrrigationEvents.map((e) => (
              <tr key={e.id} className="border-b border-line/70 last:border-0">
                <td className="py-3 font-mono text-xs text-ink-muted tabular-nums">
                  {formatShortDateWib(e.startedAt)} {formatTimeWib(e.startedAt).replace(" WIB", "")}
                </td>
                <td className="font-mono text-xs font-semibold text-ink">{e.nodeCode}</td>
                <td>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      e.triggerType === "auto"
                        ? "bg-sky-50 text-sky-700"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {e.triggerType === "auto" ? "Otomatis" : "Manual"}
                  </span>
                </td>
                <td className="text-right text-stone-600 tabular-nums">
                  {e.durationSeconds} detik
                </td>
                <td className="pl-8">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 rounded-full bg-sky-100">
                      <div
                        className="h-full rounded-full bg-sky-600"
                        style={{ width: `${maxLiters ? (e.volumeLiters / maxLiters) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="font-semibold text-ink tabular-nums">{e.volumeLiters} L</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
