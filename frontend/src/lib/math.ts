/** Satu angka di belakang koma. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Dua angka di belakang koma, untuk liter air. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
