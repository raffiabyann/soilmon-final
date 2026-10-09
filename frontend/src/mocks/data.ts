import type { Alert, Gateway, IrrigationEvent, Metric, NodeSummary } from "@soilmon/shared";

/**
 * Data contoh untuk membangun tampilan sebelum backend siap.
 * Bentuknya WAJIB sama dengan API spec; TypeScript akan protes kalau berbeda.
 * Hapus file ini saat frontend sudah tersambung ke backend (F6).
 */

/** Waktu "sekarang" tetap untuk data contoh, supaya tampilan stabil. Hapus di F6. */
export const MOCK_NOW = new Date("2026-10-14T03:20:00Z");

export const mockGateways: Gateway[] = [
  { code: "GW01", name: "Gateway Kebun", lastSeenAt: "2026-10-14T03:15:00Z" },
];

export const mockMetrics: Metric[] = [
  { key: "soil_moisture", label: "Kelembaban tanah", unit: "%", normalMin: 30, normalMax: 80 },
  { key: "soil_temperature", label: "Suhu tanah", unit: "°C", normalMin: 20, normalMax: 35 },
  { key: "soil_ph", label: "pH tanah", unit: null, normalMin: 5.5, normalMax: 7.5 },
  { key: "soil_ec", label: "Konduktivitas (EC)", unit: "µS/cm", normalMin: null, normalMax: null },
  { key: "soil_nitrogen", label: "Nitrogen (N)", unit: "mg/kg", normalMin: null, normalMax: null },
  { key: "soil_phosphorus", label: "Fosfor (P)", unit: "mg/kg", normalMin: null, normalMax: null },
  { key: "soil_potassium", label: "Kalium (K)", unit: "mg/kg", normalMin: null, normalMax: null },
  { key: "battery_percent", label: "Baterai node", unit: "%", normalMin: 20, normalMax: null },
  { key: "rssi", label: "Sinyal LoRa", unit: "dBm", normalMin: null, normalMax: null },
];

export const mockNodes: NodeSummary[] = [
  {
    code: "N01",
    name: "Node Uji 1",
    gatewayCode: "GW01",
    pumpFlowMlPerS: 30,
    lastSeenAt: "2026-10-14T03:15:00Z",
    latest: {
      soil_moisture: 34.2,
      soil_temperature: 27.8,
      soil_ph: 6.4,
      soil_ec: 850,
      soil_nitrogen: 40,
      soil_phosphorus: 25,
      soil_potassium: 120,
      battery_percent: 82,
      rssi: -71,
    },
  },
  {
    code: "N02",
    name: "Node Uji 2",
    gatewayCode: "GW01",
    pumpFlowMlPerS: 28,
    lastSeenAt: "2026-10-14T01:40:00Z",
    latest: {
      soil_moisture: 61.5,
      soil_temperature: 26.9,
      soil_ph: 4.6,
      battery_percent: 18,
      rssi: -88,
    },
  },
];

export const mockAlerts: Alert[] = [
  {
    id: 7,
    nodeCode: "N02",
    metricKey: "soil_ph",
    type: "below_min",
    value: 4.6,
    triggeredAt: "2026-10-14T01:00:00Z",
    resolvedAt: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
  },
  {
    id: 6,
    nodeCode: "N02",
    metricKey: "battery_percent",
    type: "below_min",
    value: 18,
    triggeredAt: "2026-10-14T00:30:00Z",
    resolvedAt: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
  },
  {
    id: 5,
    nodeCode: "N01",
    metricKey: "soil_moisture",
    type: "below_min",
    value: 27.1,
    triggeredAt: "2026-10-13T22:00:00Z",
    resolvedAt: "2026-10-13T23:15:00Z",
    acknowledgedBy: "Pemilik Kebun",
    acknowledgedAt: "2026-10-13T22:20:00Z",
  },
];

/**
 * Riwayat penyiraman contoh 7 hari (terbaru di atas).
 * Volume = debit pompa node × durasi (N01 30 ml/s, N02 28 ml/s).
 */
export const mockIrrigationEvents: IrrigationEvent[] = [
  {
    id: 15,
    nodeCode: "N01",
    startedAt: "2026-10-13T22:59:45Z",
    durationSeconds: 15,
    volumeLiters: 0.45,
    triggerType: "auto",
  },
  {
    id: 14,
    nodeCode: "N02",
    startedAt: "2026-10-13T09:10:00Z",
    durationSeconds: 20,
    volumeLiters: 0.56,
    triggerType: "auto",
  },
  {
    id: 13,
    nodeCode: "N01",
    startedAt: "2026-10-12T23:05:00Z",
    durationSeconds: 20,
    volumeLiters: 0.6,
    triggerType: "auto",
  },
  {
    id: 12,
    nodeCode: "N01",
    startedAt: "2026-10-12T09:30:00Z",
    durationSeconds: 15,
    volumeLiters: 0.45,
    triggerType: "manual",
  },
  {
    id: 11,
    nodeCode: "N02",
    startedAt: "2026-10-11T23:00:00Z",
    durationSeconds: 25,
    volumeLiters: 0.7,
    triggerType: "auto",
  },
  {
    id: 10,
    nodeCode: "N01",
    startedAt: "2026-10-10T23:02:00Z",
    durationSeconds: 30,
    volumeLiters: 0.9,
    triggerType: "auto",
  },
  {
    id: 9,
    nodeCode: "N01",
    startedAt: "2026-10-09T23:10:00Z",
    durationSeconds: 20,
    volumeLiters: 0.6,
    triggerType: "auto",
  },
  {
    id: 8,
    nodeCode: "N02",
    startedAt: "2026-10-09T08:45:00Z",
    durationSeconds: 15,
    volumeLiters: 0.42,
    triggerType: "auto",
  },
  {
    id: 7,
    nodeCode: "N01",
    startedAt: "2026-10-08T23:00:00Z",
    durationSeconds: 25,
    volumeLiters: 0.75,
    triggerType: "auto",
  },
  {
    id: 6,
    nodeCode: "N01",
    startedAt: "2026-10-07T23:20:00Z",
    durationSeconds: 20,
    volumeLiters: 0.6,
    triggerType: "auto",
  },
];
