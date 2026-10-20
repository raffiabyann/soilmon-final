import { isOnline } from "@soilmon/shared";
import type { LucideIcon } from "lucide-react";
import { Bell, Droplets, Router, Wifi } from "lucide-react";
import { Card } from "./Card";
import { CardLabel } from "./CardLabel";
import { round2 } from "../lib/math";
import { getMetric } from "../lib/metrics";
import { dateKeyWib, formatClockWib, formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockGateways, mockIrrigationEvents, mockNodes } from "../mocks/data";

interface Kpi {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "danger" | "water";
}

interface Issue {
  text: string;
  tone: "danger" | "neutral";
}

function greeting(now: Date): string {
  const hour = (now.getUTCHours() + 7) % 24;
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

const DOT: Record<Kpi["tone"], string> = { ok: "bg-ok", danger: "bg-danger", water: "bg-water" };

/**
 * Kartu pembuka Dashboard (Figma: "Kondisi kebun"): sapaan + jumlah hal yang perlu dicek,
 * chip masalah, lalu 4 angka ringkas (gateway, node, alert, air hari ini).
 */
export function GreetingCard() {
  const gateway = mockGateways[0];
  const gatewayOnline = gateway ? isOnline(gateway.lastSeenAt, MOCK_NOW) : false;
  const offlineNodes = mockNodes.filter((n) => !isOnline(n.lastSeenAt, MOCK_NOW));
  const openAlerts = mockAlerts.filter((a) => a.resolvedAt === null);
  const todayKey = dateKeyWib(MOCK_NOW);
  const todayWater = mockIrrigationEvents.filter((e) => dateKeyWib(e.startedAt) === todayKey);
  const todayLiters = round2(todayWater.reduce((s, e) => s + e.volumeLiters, 0));
  const lastToday = todayWater[0];

  const issues: Issue[] = [
    ...openAlerts.map((a) => {
      const node = mockNodes.find((n) => n.code === a.nodeCode);
      const latest = node?.latest[a.metricKey] ?? a.value;
      const label = getMetric(a.metricKey)?.label.replace(" tanah", "").replace(" node", "") ?? "";
      const unit = getMetric(a.metricKey)?.unit === "%" ? "%" : "";
      const word = a.type === "below_min" ? "rendah" : "tinggi";
      return { text: `${label} ${a.nodeCode} ${word} (${latest}${unit})`, tone: "danger" as const };
    }),
    ...offlineNodes.map((n) => ({
      text: `${n.code} offline sejak ${n.lastSeenAt ? formatClockWib(n.lastSeenAt) : "-"}`,
      tone: "neutral" as const,
    })),
  ];

  const kpis: Kpi[] = [
    {
      icon: Wifi,
      label: "Gateway",
      value: gatewayOnline ? "Online" : "Offline",
      hint: `Sync ${gateway?.lastSeenAt ? formatTimeWib(gateway.lastSeenAt) : "-"}`,
      tone: gatewayOnline ? "ok" : "danger",
    },
    {
      icon: Router,
      label: "Node aktif",
      value: `${mockNodes.length - offlineNodes.length} / ${mockNodes.length}`,
      hint:
        offlineNodes.length === 0
          ? "Semua mengirim"
          : `${offlineNodes.map((n) => n.code).join(", ")} tidak mengirim`,
      tone: offlineNodes.length === 0 ? "ok" : "danger",
    },
    {
      icon: Bell,
      label: "Alert aktif",
      value: String(openAlerts.length),
      hint: openAlerts.length === 0 ? "Semua normal" : "Belum kembali normal",
      tone: openAlerts.length === 0 ? "ok" : "danger",
    },
    {
      icon: Droplets,
      label: "Air hari ini",
      value: `${todayLiters} L`,
      hint: lastToday
        ? `${todayWater.length}× pompa · ${formatClockWib(lastToday.startedAt)}`
        : "Pompa belum menyala",
      tone: "water",
    },
  ];

  return (
    <Card className="flex h-full flex-col justify-between gap-6">
      <div>
        <CardLabel>Kebun Belimbing · Tuban</CardLabel>
        <h2 className="mt-3 text-[28px] leading-tight font-bold tracking-tight text-ink">
          {greeting(MOCK_NOW)}.{" "}
          {issues.length > 0
            ? `Ada ${issues.length} hal yang perlu kamu cek hari ini.`
            : "Kebun dalam kondisi baik."}
        </h2>
        {issues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {issues.map((i) => (
              <span
                key={i.text}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  i.tone === "danger"
                    ? "bg-danger-soft text-danger-ink"
                    : "bg-line-soft text-ink-soft"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${i.tone === "danger" ? "bg-danger" : "bg-ink-faint"}`}
                />
                {i.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-y-5 border-t border-line pt-5 sm:grid-cols-4 sm:divide-x sm:divide-line">
        {kpis.map((k) => (
          <div key={k.label} className="px-4 first:pl-0 last:pr-0">
            <CardLabel>
              <k.icon className="size-3.5" />
              {k.label}
            </CardLabel>
            <p className="mt-1.5 text-[30px] leading-none font-bold tracking-tight text-ink">
              {k.value}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
              <span className={`size-1.5 shrink-0 rounded-full ${DOT[k.tone]}`} />
              {k.hint}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
