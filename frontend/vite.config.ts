import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** VITE_BASE_PATH dirapikan jadi "/x/": "soilmon" dan "/soilmon" sama dengan "/soilmon/". */
function normalizeBase(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

export default defineConfig(({ mode }) => {
  // "." adalah frontend/: skrip pnpm selalu jalan di folder paketnya.
  const base = normalizeBase(loadEnv(mode, ".", "VITE_").VITE_BASE_PATH);

  // Meniru nginx: <base>api/ diteruskan ke backend sebagai /api/.
  const apiPrefix = `${base}api`;
  const proxy = {
    [apiPrefix]: {
      // Bukan localhost: Node baru bisa memilih ::1, padahal backend default hanya di 127.0.0.1.
      target: "http://127.0.0.1:3000",
      changeOrigin: true,
      rewrite: (path: string) => path.replace(apiPrefix, "/api"),
    },
  };

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
