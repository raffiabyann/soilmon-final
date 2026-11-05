import { Sprout } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import { Card } from "../components/Card";
import { TextField } from "../components/TextField";
import { ApiError, describeApiError, login } from "../lib/api";
import { useAuthState } from "../lib/auth";

/** Alamat tujuan setelah login: hanya path di aplikasi ini, bukan alamat luar. */
function readTarget(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";
}

/** Pesan untuk pengguna. Salah email/password dan salah isian memakai pesan backend apa adanya. */
function loginMessage(error: ApiError): string {
  if (error.status === 401 || error.code === "validation_failed") return error.message;
  return describeApiError(error, "");
}

/** Halaman masuk. Kalau sudah ada sesi, langsung diteruskan ke tujuan. */
export function LoginPage() {
  const { session, notice } = useAuthState();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={readTarget(location.state)} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // Berhasil: sesi tersimpan, komponen ini dirender ulang dan <Navigate> di atas yang berpindah.
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError ? loginMessage(err) : "Terjadi kesalahan yang tidak terduga.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <Card className="w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-[12px] bg-brand text-on-accent">
            <Sprout className="size-5" />
          </div>
          <div>
            <h1 className="text-xl leading-tight font-bold text-ink">SoilMon</h1>
            <p className="text-xs text-ink-muted">Masuk untuk melihat data kebun</p>
          </div>
        </div>

        {notice === "expired" && !error && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-line bg-line-soft px-4 py-2.5 text-sm text-ink-soft"
          >
            Sesi Anda berakhir. Silakan masuk lagi.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-danger-line bg-danger-soft px-4 py-2.5 text-sm text-danger-ink"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || email.trim() === "" || password === ""}
            className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-50 pointer-coarse:min-h-11"
          >
            {submitting ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
      </Card>
    </div>
  );
}
