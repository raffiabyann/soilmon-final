import type { Alert } from "@soilmon/shared";
import { Bell, Droplets } from "lucide-react";
import { useState } from "react";
import { AlertItem } from "../components/AlertItem";
import { Card } from "../components/Card";
import { formatDateWib, formatTimeWib } from "../lib/time";
import { mockAlerts, mockIrrigationEvents } from "../mocks/data";

type AlertFilter = "all" | "active" | "resolved";

const FILTERS: { value: AlertFilter; label: string; match: (a: Alert) => boolean }[] = [
  { value: "all", label: "Semua", match: () => true },
  { value: "active", label: "Aktif", match: (a) => a.resolvedAt === null },
  { value: "resolved", label: "Selesai", match: (a) => a.resolvedAt !== null },
];

export function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const current = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const shown = current ? mockAlerts.filter(current.match) : mockAlerts;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-100">
          <Bell className="size-4" /> Riwayat Alert
        </h2>
        <div className="mb-2 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f.value
                  ? "border-green-600 bg-green-700 text-white"
                  : "border-gray-700 text-gray-400 hover:bg-gray-800"
              }`}
            >
              {f.label} <span className="ml-1 opacity-70">{mockAlerts.filter(f.match).length}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Tidak ada alert.</p>
        ) : (
          <ul>
            {shown.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 font-semibold text-gray-100">
          <Droplets className="size-4" /> Riwayat Penyiraman
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Pompa di node menyala otomatis saat tanah kering. Volume adalah perkiraan (debit ×
          durasi).
        </p>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 text-xs uppercase text-gray-500">
            <tr>
              <th className="py-3">Waktu</th>
              <th>Node</th>
              <th>Durasi</th>
              <th>Volume (perkiraan)</th>
              <th>Pemicu</th>
            </tr>
          </thead>
          <tbody>
            {mockIrrigationEvents.map((e) => (
              <tr key={e.id} className="border-b border-gray-800/60">
                <td className="py-3 text-gray-400">
                  {formatDateWib(e.startedAt)}, {formatTimeWib(e.startedAt)}
                </td>
                <td className="font-medium text-gray-100">{e.nodeCode}</td>
                <td>{e.durationSeconds} detik</td>
                <td>{e.volumeLiters} L</td>
                <td>{e.triggerType === "auto" ? "Otomatis" : "Manual"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
