/**
 * Arti tujuh register sensor tanah (rawRegisters[0] sampai [6], Modbus 0x0000 sampai 0x0006).
 *
 * Sumber: firmware gateway tim hardware CE631L (03 Appendix A.1). BELUM diverifikasi dengan
 * datasheet sensor. Ini satu-satunya tempat konversi; database dan API tetap memakai nilai mentah.
 * Keputusan sementara: 07 §9.1 (penyimpangan dari 06 WA-04 sampai API-09 ada).
 */
export interface RegisterSpec {
  /** Nama kolom mentah, "R1" sampai "R7". */
  raw: string;
  label: string;
  /** Kosong untuk pH. */
  unit: string;
  divisor: number;
  /** true: dibaca sebagai int16 (two's complement), bukan uint16. */
  signed: boolean;
  decimals: number;
}

export const REGISTER_SPECS: readonly RegisterSpec[] = [
  { raw: "R1", label: "Kelembapan", unit: "%RH", divisor: 10, signed: false, decimals: 1 },
  { raw: "R2", label: "Suhu", unit: "°C", divisor: 10, signed: true, decimals: 1 },
  { raw: "R3", label: "EC", unit: "µS/cm", divisor: 1, signed: false, decimals: 0 },
  { raw: "R4", label: "pH", unit: "", divisor: 10, signed: false, decimals: 1 },
  { raw: "R5", label: "N", unit: "mg/kg", divisor: 1, signed: false, decimals: 0 },
  { raw: "R6", label: "P", unit: "mg/kg", divisor: 1, signed: false, decimals: 0 },
  { raw: "R7", label: "K", unit: "mg/kg", divisor: 1, signed: false, decimals: 0 },
];

function isUint16(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

/** Nilai bersatuan, atau null kalau register tidak dikenal atau nilainya bukan uint16. */
export function convertRegister(index: number, raw: number | undefined): number | null {
  const spec = REGISTER_SPECS[index];
  if (!spec || !isUint16(raw)) return null;
  const value = spec.signed && raw >= 0x8000 ? raw - 0x10000 : raw;
  return value / spec.divisor;
}

/** Angka dengan jumlah desimal tetap, tanpa satuan. null kalau tidak bisa dikonversi. */
export function formatRegister(index: number, raw: number | undefined): string | null {
  const value = convertRegister(index, raw);
  const spec = REGISTER_SPECS[index];
  if (value === null || !spec) return null;
  // toFixed memberi "-0.0" untuk nilai negatif kecil yang dibulatkan ke nol.
  const text = value.toFixed(spec.decimals);
  return Number(text) === 0 ? (0).toFixed(spec.decimals) : text;
}
