import type { Alert } from "@soilmon/shared";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { alertState, describeAlert, type AlertState } from "../lib/alerts";
import { DAY_MS, dateKeyWib, formatClockWib } from "../lib/time";
import { useNow } from "../lib/useNow";
import { mockAlerts } from "../mocks/data";
import { Badge, type BadgeTone } from "./Badge";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const STATE_ORDER: AlertState[] = ["active", "acknowledged", "resolved"];
const STATE: Record<AlertState, { label: string; dot: string; tone: BadgeTone }> = {
  active: { label: "Aktif", dot: "bg-danger", tone: "danger" },
  acknowledged: { label: "Dibaca", dot: "bg-accent", tone: "warning" },
  resolved: { label: "Selesai", dot: "bg-ok", tone: "ok" },
};

/** Tanggal "YYYY-MM-DD" sebagai Date tengah malam UTC, supaya hitungan hari tidak kena zona waktu. */
function keyToDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 42 tanggal (6 minggu, mulai Minggu) yang menampilkan bulan `monthKey` ("YYYY-MM"). */
function monthGrid(monthKey: string): string[] {
  const first = keyToDate(`${monthKey}-01`);
  const start = first.getTime() - first.getUTCDay() * DAY_MS;
  return Array.from({ length: 42 }, (_, i) => dateToKey(new Date(start + i * DAY_MS)));
}

function shiftMonth(monthKey: string, delta: number): string {
  const d = keyToDate(`${monthKey}-01`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return dateToKey(d).slice(0, 7);
}

function formatMonth(monthKey: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(keyToDate(`${monthKey}-01`));
}

function formatDay(key: string, style: "short" | "long"): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: style,
    day: "numeric",
    month: style,
    year: "numeric",
  }).format(keyToDate(key));
}

/** Kalender: titik status alert di tiap tanggal (WIB), lalu alert tanggal yang dipilih dan tautan ke Alerts. */
export function AlertCalendarCard() {
  const todayKey = dateKeyWib(useNow(60_000));
  const [selected, setSelected] = useState(todayKey);
  const [month, setMonth] = useState(todayKey.slice(0, 7));

  const byDay = new Map<string, Alert[]>();
  for (const a of mockAlerts) {
    const key = dateKeyWib(a.triggeredAt);
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }
  const stateOf = (a: Alert) => alertState(a, a.acknowledgedAt !== null);
  const dayAlerts = [...(byDay.get(selected) ?? [])].sort((a, b) =>
    a.triggeredAt.localeCompare(b.triggeredAt),
  );

  const pick = (key: string) => {
    setSelected(key);
    setMonth(key.slice(0, 7));
  };

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <CardLabel>
          <CalendarDays className="size-3.5" /> Kalender
        </CardLabel>
        <div className="flex items-center gap-1">
          <MonthButton label="Bulan sebelumnya" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft className="size-4" />
          </MonthButton>
          <p className="min-w-32 text-center text-sm font-semibold text-ink" aria-live="polite">
            {formatMonth(month)}
          </p>
          <MonthButton label="Bulan berikutnya" onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight className="size-4" />
          </MonthButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d) => (
          <p key={d} className="pb-1 text-xs text-ink-muted">
            {d}
          </p>
        ))}
        {monthGrid(month).map((key) => {
          const inMonth = key.startsWith(month);
          const isSelected = key === selected;
          const isToday = key === todayKey;
          const alerts = byDay.get(key) ?? [];
          const states = STATE_ORDER.filter((s) => alerts.some((a) => stateOf(a) === s));
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(key)}
              aria-pressed={isSelected}
              aria-label={`${formatDay(key, "long")}${alerts.length ? `, ${alerts.length} alert` : ""}`}
              className={`mx-auto flex size-10 flex-col text-sm items-center justify-center gap-0.5 rounded-xl tabular-nums transition-colors pointer-coarse:size-11 ${
                isSelected
                  ? "bg-brand font-semibold text-on-accent"
                  : `hover:bg-line-soft ${isToday ? "border border-brand font-semibold text-brand" : ""} ${
                      inMonth ? "text-ink" : "text-ink-muted"
                    }`
              }`}
            >
              {Number(key.slice(8))}
              <span className="flex h-1.5 gap-0.5">
                {states.map((s) => (
                  <span
                    key={s}
                    className={`size-1.5 rounded-full ${isSelected ? "bg-on-accent" : STATE[s].dot}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {STATE_ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${STATE[s].dot}`} />
            {STATE[s].label}
          </span>
        ))}
      </div>

      <div className="border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink">{formatDay(selected, "short")}</p>
          {dayAlerts.length > 0 && (
            <Link
              to="/alerts"
              className="text-xs font-semibold text-brand hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
            >
              Lihat semua
            </Link>
          )}
        </div>
        {dayAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Tidak ada alert pada tanggal ini.</p>
        ) : (
          <ul className="mt-1">
            {dayAlerts.map((a) => {
              const state = STATE[stateOf(a)];
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-line-soft py-2.5 text-sm last:border-0"
                >
                  <span className="font-mono text-xs text-ink-muted tabular-nums">
                    {formatClockWib(a.triggeredAt)}
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink">{a.nodeCode}</span>
                  <span className="min-w-0 flex-1 text-ink">{describeAlert(a)}</span>
                  <Badge tone={state.tone}>{state.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-line-soft hover:text-ink pointer-coarse:size-11"
    >
      {children}
    </button>
  );
}
