/**
 * Sub-path tempat aplikasi di-deploy, dari `base` Vite (VITE_BASE_PATH saat build).
 * Dev lokal: "/". Produksi: "/soilmon/", dengan nginx meneruskan /soilmon/api/ ke backend.
 */
const BASE_URL = import.meta.env.BASE_URL;

/** Basename React Router, tanpa garis miring di akhir ("/soilmon" atau "/"). */
export const routerBasename = BASE_URL.replace(/\/+$/, "") || "/";

/** Alamat file di public/ atau endpoint backend, ikut sub-path. `path` diawali "/". */
export function withBase(path: string): string {
  return BASE_URL.replace(/\/+$/, "") + path;
}
