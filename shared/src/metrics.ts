export const METRIC_KEYS = [
  "soil_moisture",
  "soil_temperature",
  "soil_ph",
  "soil_ec",
  "soil_nitrogen",
  "soil_phosphorus",
  "soil_potassium",
  "battery_percent",
  "rssi",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];
