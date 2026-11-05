import { useSyncExternalStore } from "react";

/** Role dari backend. Sengaja lokal: UserRole di @soilmon/shared masih memakai nama lain. */
export type AuthRole = "admin" | "viewer";

export function isAuthRole(value: unknown): value is AuthRole {
  return value === "admin" || value === "viewer";
}

export interface Session {
  accessToken: string;
  email: string;
  role: AuthRole;
}

/** "expired" = backend menolak token (401); null = pengguna keluar sendiri atau belum pernah masuk. */
export interface AuthState {
  session: Session | null;
  notice: "expired" | null;
}

/**
 * Token, email, dan role disimpan di localStorage supaya login bertahan saat halaman dimuat ulang.
 *
 * Catatan keamanan: localStorage bisa dibaca oleh JavaScript apa pun yang berjalan di halaman ini,
 * jadi satu celah XSS cukup untuk mencuri token. Cookie httpOnly lebih aman karena JavaScript tidak
 * bisa membacanya, tetapi butuh perubahan di backend (Set-Cookie, perlindungan CSRF, CORS), dan
 * backend sudah ditetapkan memakai header Authorization: Bearer. localStorage dipilih karena
 * sesuai kontrak itu dan token hanya berlaku 1 jam. Mitigasinya: React meng-escape semua teks
 * secara bawaan, dan kode ini tidak memakai dangerouslySetInnerHTML.
 *
 * Role yang tersimpan hanya untuk menyesuaikan tampilan. Backend yang memutuskan boleh atau tidak:
 * mengubah role di localStorage tidak memberi akses apa pun.
 */
const STORAGE_KEY = "soilmon-auth";

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { accessToken, email, role } = value as Record<string, unknown>;
    if (typeof accessToken !== "string" || accessToken === "") return null;
    if (typeof email !== "string" || !isAuthRole(role)) return null;
    return { accessToken, email, role };
  } catch {
    // localStorage diblokir (mode privat) atau isinya rusak: anggap belum masuk.
    return null;
  }
}

function writeStored(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sesi tetap berlaku di memori sampai halaman dimuat ulang.
  }
}

// Sumber kebenaran selama halaman terbuka. localStorage hanya untuk bertahan antar muat ulang.
let state: AuthState = { session: readStored(), notice: null };
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Masuk atau keluar di tab lain ikut berlaku di tab ini.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    setState({ session: readStored(), notice: null });
  }
});

export function getAccessToken(): string | null {
  return state.session?.accessToken ?? null;
}

export function saveSession(session: Session) {
  writeStored(session);
  setState({ session, notice: null });
}

/** Hapus sesi. Dipanggil saat pengguna menekan Keluar, atau saat backend menjawab 401. */
export function endSession(reason: "logout" | "expired") {
  writeStored(null);
  setState({ session: null, notice: reason === "expired" ? "expired" : null });
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, () => state);
}
