import { isOnline } from "@soilmon/shared";
import { Clock } from "lucide-react";
import { MOCK_NOW, mockGateways } from "../mocks/data";
import { formatTimeWib } from "../lib/time";

export function GatewayStatusCard() {
  const gateway = mockGateways[0];
  if (!gateway) {
    return null;
  }
  const online = isOnline(gateway.lastSeenAt, MOCK_NOW);

  return (
    <div className="rounded-xl bg-brand-soft p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold text-ink">
        <span className={`size-2 rounded-full ${online ? "bg-green-600" : "bg-red-600"}`} />
        Gateway {online ? "Online" : "Offline"}
      </div>
      <p className="ml-4 text-xs text-ink-muted">{gateway.name}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          Last Sync
        </span>
        <span>{gateway.lastSeenAt ? formatTimeWib(gateway.lastSeenAt) : "-"}</span>
      </div>
    </div>
  );
}
