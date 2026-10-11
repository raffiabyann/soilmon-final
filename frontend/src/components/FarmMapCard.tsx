import { getMetricStatus, isOnline } from "@soilmon/shared";
import { BatteryMedium, Map as MapIcon, SignalHigh } from "lucide-react";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { getMetric } from "../lib/metrics";
import { formatClockWib } from "../lib/time";
import { MOCK_NOW, mockNodes } from "../mocks/data";

const ROWS = 5;
const COLS = 11;

/** Posisi node di skema kebun (baris, kolom pohon). Ubah kalau letak node di lapangan berubah. */
const NODE_POSITION: Record<string, { row: number; col: number }> = {
  N01: { row: 1, col: 2 },
  N02: { row: 3, col: 7 },
};

/**
 * Peta skematis kebun (bukan skala): titik = pohon, pin = node.
 * Di bawahnya daftar node dengan baterai, sinyal, dan jam kiriman terakhir.
 */
export function FarmMapCard() {
  const battery = getMetric("battery_percent");

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <CardLabel>
          <MapIcon className="size-3.5" /> Peta kebun
        </CardLabel>
        <span className="text-xs text-ink-muted">Skema, bukan skala</span>
      </div>

      <div
        className="relative rounded-2xl bg-band p-4"
        role="img"
        aria-label="Skema kebun dengan letak node"
      >
        <div className="grid gap-y-3" style={{ gridTemplateRows: `repeat(${ROWS}, 24px)` }}>
          {Array.from({ length: ROWS }, (_, row) => (
            <div
              key={row}
              className="relative flex items-center justify-between rounded-full bg-brand-soft/60 px-3"
            >
              {Array.from({ length: COLS }, (_, col) => (
                <span key={col} className="size-3 rounded-full bg-brand/45" />
              ))}
            </div>
          ))}
        </div>
        {mockNodes.map((n) => {
          const pos = NODE_POSITION[n.code];
          if (!pos) return null;
          const online = isOnline(n.lastSeenAt, MOCK_NOW);
          return (
            <span
              key={n.code}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border-2 bg-surface px-2 py-0.5 text-xs shadow-card ${
                online ? "border-ok" : "border-danger"
              }`}
              style={{
                left: `calc(34px + ${pos.col} * ((100% - 68px) / ${COLS - 1}))`,
                top: `calc(28px + ${pos.row} * 36px)`,
              }}
            >
              <span className={`size-2.5 rounded-full ${online ? "bg-ok" : "bg-danger"}`} />
              <span className="font-mono font-semibold text-ink">{n.code}</span>
              <span className="text-ink-muted">{online ? "Online" : "Offline"}</span>
            </span>
          );
        })}
      </div>

      <ul className="divide-y divide-line">
        {mockNodes.map((n) => {
          const online = isOnline(n.lastSeenAt, MOCK_NOW);
          const bat = n.latest.battery_percent;
          const batLow =
            bat !== undefined && battery ? getMetricStatus(bat, battery) === "low" : false;
          return (
            <li key={n.code} className="flex items-center gap-3 py-2.5 text-xs">
              <span className={`size-2 rounded-full ${online ? "bg-ok" : "bg-danger"}`} />
              <span className="font-mono font-semibold text-ink">{n.code}</span>
              <span className="flex-1 text-ink-muted">{n.name}</span>
              <span
                className={`flex items-center gap-1 font-mono ${batLow ? "text-danger" : "text-ink-soft"}`}
              >
                <BatteryMedium className="size-3.5" />
                {bat ?? "-"}%
              </span>
              <span className="flex items-center gap-1 font-mono text-ink-soft">
                <SignalHigh className="size-3.5" />
                {n.latest.rssi ?? "-"} dBm
              </span>
              <span className="font-mono text-ink-muted">
                {n.lastSeenAt ? formatClockWib(n.lastSeenAt) : "-"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
