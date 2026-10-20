import { isOnline, type Alert } from "@soilmon/shared";
import { CircleCheck, WifiOff } from "lucide-react";
import { Fragment, useState } from "react";
import { AlertHeroCard } from "../components/AlertHeroCard";
import { AlertItem } from "../components/AlertItem";
import { Card } from "../components/Card";
import { CardLabel } from "../components/CardLabel";
import { IrrigationTable } from "../components/IrrigationTable";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { alertState, formatDuration, minutesToResolve, type AlertState } from "../lib/alerts";
import {
  DAY_MS,
  dateKeyWib,
  formatClockWib,
  formatLongDateWib,
  formatShortDateWib,
} from "../lib/time";
import { MOCK_NOW, mockAlerts, mockNodes } from "../mocks/data";

type Filter = "all" | AlertState;

/** Label pemisah per hari: "HARI INI · RABU, 14 OKT", "KEMARIN · ...", atau tanggalnya saja. */
function dayLabel(iso: string): string {
  const key = dateKeyWib(iso);
  const long = formatLongDateWib(iso).replace(/ \d{4}$/, "");
  if (key === dateKeyWib(MOCK_NOW)) return `Hari ini · ${long}`;
  if (key === dateKeyWib(new Date(MOCK_NOW.getTime() - DAY_MS))) return `Kemarin · ${long}`;
  return long;
}

/** Alerts (Figma: "Alerts · Redesign"). Tandai dibaca masih di memori sampai F6 (PATCH /alerts/{id}). */
export function AlertsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  /** id → jam ditandai di sesi ini. Hilang saat halaman dimuat ulang. */
  const [acked, setAcked] = useState<ReadonlyMap<number, Date>>(new Map());

  const isAcked = (a: Alert) => a.acknowledgedAt !== null || acked.has(a.id);
  const acknowledge = (id: number) => setAcked((prev) => new Map(prev).set(id, new Date()));
  const stateOf = (a: Alert) => alertState(a, isAcked(a));

  const counts: Record<AlertState, number> = { active: 0, acknowledged: 0, resolved: 0 };
  for (const a of mockAlerts) counts[stateOf(a)] += 1;
  const open = counts.active + counts.acknowledged;

  const sorted = [...mockAlerts].sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt));
  const shown = sorted.filter((a) => filter === "all" || stateOf(a) === filter);
  const hero = sorted.find((a) => stateOf(a) === "active");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts"
        description="Satu masalah = satu alert. Alert selesai sendiri saat nilai kembali ke batas normal."
        stat={open}
        statCaption={`alert aktif · ${counts.active} belum dibaca`}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        {hero ? (
          <AlertHeroCard alert={hero} onAcknowledge={() => acknowledge(hero.id)} />
        ) : (
          <Card className="flex items-center gap-4">
            <CircleCheck className="size-8 text-ok" />
            <div>
              <p className="text-lg font-semibold text-ink">Tidak ada alert baru</p>
              <p className="text-sm text-ink-muted">
                Semua alert sudah dibaca. Alert yang belum normal tetap ada di daftar di bawah.
              </p>
            </div>
          </Card>
        )}
        <StatusSummaryCard counts={counts} />
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Daftar alert</h2>
            <p className="text-xs text-ink-muted">
              Terbaru di atas. Tandai dibaca supaya tim tahu sudah ada yang menangani.
            </p>
          </div>
          <Segmented
            ariaLabel="Filter status alert"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Semua", count: mockAlerts.length },
              { value: "active", label: "Aktif", count: counts.active },
              { value: "acknowledged", label: "Dibaca", count: counts.acknowledged },
              { value: "resolved", label: "Selesai", count: counts.resolved },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            Tidak ada alert untuk filter ini.
          </p>
        ) : (
          <ul className="space-y-3">
            {shown.map((alert, i) => {
              const prev = shown[i - 1];
              const newDay =
                !prev || dateKeyWib(prev.triggeredAt) !== dateKeyWib(alert.triggeredAt);
              const ackAt = acked.get(alert.id);
              return (
                <Fragment key={alert.id}>
                  {newDay && <li className="label-mono pt-1">{dayLabel(alert.triggeredAt)}</li>}
                  <AlertItem
                    alert={alert}
                    acknowledged={isAcked(alert)}
                    ackLabel={ackAt ? `Dibaca Anda · ${formatClockWib(ackAt)}` : undefined}
                    onAcknowledge={() => acknowledge(alert.id)}
                  />
                </Fragment>
              );
            })}
          </ul>
        )}
      </Card>

      <IrrigationTable />
    </div>
  );
}

/** Kartu "Status alert · 7 hari": bar bertumpuk, jumlah per status, rata-rata waktu selesai. */
function StatusSummaryCard({ counts }: { counts: Record<AlertState, number> }) {
  const rows: { state: AlertState; label: string; hint: string; dot: string; bar: string }[] = [
    { state: "active", label: "Aktif", hint: "belum dibaca", dot: "bg-danger", bar: "bg-danger" },
    {
      state: "acknowledged",
      label: "Dibaca",
      hint: "ditangani, belum normal",
      dot: "bg-accent",
      bar: "bg-accent",
    },
    { state: "resolved", label: "Selesai", hint: "kembali normal", dot: "bg-ok", bar: "bg-ok" },
  ];
  const durations = mockAlerts.map(minutesToResolve).filter((m): m is number => m !== null);
  const avg = durations.length ? durations.reduce((s, m) => s + m, 0) / durations.length : null;
  const offline = mockNodes.filter((n) => !isOnline(n.lastSeenAt, MOCK_NOW));

  return (
    <Card className="flex flex-col gap-4">
      <CardLabel>Status alert</CardLabel>
      <div className="flex h-2.5 gap-[3px]">
        {rows.map((r) =>
          counts[r.state] > 0 ? (
            <span
              key={r.state}
              className={`rounded-full ${r.bar}`}
              style={{ flexGrow: counts[r.state] }}
            />
          ) : null,
        )}
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.state} className="flex items-center gap-2.5 text-sm">
            <span className={`size-2 rounded-full ${r.dot}`} />
            <span className="font-semibold text-ink">{r.label}</span>
            <span className="flex-1 text-xs text-ink-muted">{r.hint}</span>
            <span className="font-mono text-xs text-ink">{counts[r.state]}</span>
          </li>
        ))}
      </ul>
      <div className="h-px bg-line-soft" />
      <p className="flex items-baseline gap-2.5">
        <span className="text-[30px] leading-none font-bold tracking-tight text-ink">
          {avg === null ? "–" : formatDuration(avg)}
        </span>
        <span className="text-xs text-ink-muted">rata-rata sampai selesai</span>
      </p>
      {offline.map((n) => (
        <div key={n.code} className="flex gap-3 rounded-xl bg-canvas px-3.5 py-3">
          <WifiOff className="mt-0.5 size-[18px] shrink-0 text-ink-muted" />
          <div>
            <p className="text-xs font-semibold text-ink">
              {n.code} offline sejak {n.lastSeenAt ? formatClockWib(n.lastSeenAt) : "-"}
            </p>
            <p className="text-xs text-ink-muted">
              Ini status node, bukan alert. Data terakhir masuk{" "}
              {n.lastSeenAt
                ? `${formatShortDateWib(n.lastSeenAt)} ${formatClockWib(n.lastSeenAt)} WIB`
                : "-"}
              .
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}
