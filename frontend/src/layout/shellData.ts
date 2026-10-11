import { isOnline } from "@soilmon/shared";
import { formatTimeWib } from "../lib/time";
import { MOCK_NOW, mockAlerts, mockGateways, mockNodes } from "../mocks/data";

/**
 * Data kecil yang dipakai rail dan sidebar terbuka (jumlah alert, status gateway & node).
 * Satu tempat supaya kedua bentuk sidebar selalu menampilkan angka yang sama.
 * Di F6 sumbernya diganti GET /alerts, /gateways, /nodes.
 */
export function getShellData() {
  const gateway = mockGateways[0];
  const gatewayOnline = gateway ? isOnline(gateway.lastSeenAt, MOCK_NOW) : false;
  return {
    openAlertCount: mockAlerts.filter((a) => a.resolvedAt === null).length,
    gateway: {
      code: gateway?.code ?? "-",
      online: gatewayOnline,
      syncLabel: gateway?.lastSeenAt ? formatTimeWib(gateway.lastSeenAt) : "-",
    },
    nodes: mockNodes.map((n) => ({
      code: n.code,
      name: n.name,
      online: isOnline(n.lastSeenAt, MOCK_NOW),
      lastSeen: n.lastSeenAt ? formatTimeWib(n.lastSeenAt).replace(" WIB", "") : "-",
    })),
  };
}

/** Cocokkan URL dengan menu; "/" hanya aktif kalau persis di beranda. */
export function isNavActive(path: string, pathname: string): boolean {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}
