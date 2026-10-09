import type { Alert, IrrigationEvent, IsoDateTime, NodeSummary } from "@soilmon/shared";
import { isOnline } from "@soilmon/shared";
import { describeAlert } from "./alerts";
import { getMetric } from "./metrics";
import { formatTimeWib } from "./time";

export type ActivityKind = "alert" | "ack" | "resolved" | "irrigation" | "offline";

export interface ActivityEntry {
  /** Unik per baris, untuk key React. */
  id: string;
  at: IsoDateTime;
  kind: ActivityKind;
  nodeCode: string;
  text: string;
}

/**
 * Gabungkan alert, penyiraman, dan node offline jadi satu log berurutan (terbaru di atas).
 * Tidak ada tabel log di database: semua dirangkai dari data yang sudah ada.
 */
export function buildActivityLog(
  alerts: Alert[],
  irrigations: IrrigationEvent[],
  nodes: NodeSummary[],
  now: Date,
  limit = 8,
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const alert of alerts) {
    entries.push({
      id: `alert-${alert.id}`,
      at: alert.triggeredAt,
      kind: "alert",
      nodeCode: alert.nodeCode,
      text: describeAlert(alert),
    });
    if (alert.acknowledgedAt) {
      entries.push({
        id: `ack-${alert.id}`,
        at: alert.acknowledgedAt,
        kind: "ack",
        nodeCode: alert.nodeCode,
        text: `Alert dibaca oleh ${alert.acknowledgedBy ?? "pengguna"}`,
      });
    }
    if (alert.resolvedAt) {
      const label = getMetric(alert.metricKey)?.label ?? alert.metricKey;
      entries.push({
        id: `resolved-${alert.id}`,
        at: alert.resolvedAt,
        kind: "resolved",
        nodeCode: alert.nodeCode,
        text: `${label} kembali normal`,
      });
    }
  }

  for (const e of irrigations) {
    const trigger = e.triggerType === "auto" ? "otomatis" : "manual";
    entries.push({
      id: `irrigation-${e.id}`,
      at: e.startedAt,
      kind: "irrigation",
      nodeCode: e.nodeCode,
      text: `Penyiraman ${e.volumeLiters} L, ${e.durationSeconds} detik (${trigger})`,
    });
  }

  for (const node of nodes) {
    if (node.lastSeenAt && !isOnline(node.lastSeenAt, now)) {
      entries.push({
        id: `offline-${node.code}`,
        at: node.lastSeenAt,
        kind: "offline",
        nodeCode: node.code,
        text: `Kiriman terakhir ${formatTimeWib(node.lastSeenAt)}, sejak itu node offline`,
      });
    }
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
