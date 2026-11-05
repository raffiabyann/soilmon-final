import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthState } from "../lib/auth";

/**
 * Pembungkus semua halaman kecuali /login. Ini hanya mengatur tampilan: tanpa sesi, pengguna
 * dibawa ke halaman login. Yang menolak data tetap backend (401/403), bukan pengecekan di sini.
 */
export function RequireAuth() {
  const { session, notice } = useAuthState();
  const location = useLocation();

  if (!session) {
    // Halaman asal hanya diingat kalau sesi berakhir; setelah Keluar, login mulai dari beranda.
    const from = notice === "expired" ? location.pathname + location.search : undefined;
    return <Navigate to="/login" replace state={from ? { from } : null} />;
  }
  return <Outlet />;
}
