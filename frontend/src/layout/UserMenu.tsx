import { LogOut } from "lucide-react";
import { Badge } from "../components/Badge";
import { endSession, useAuthState } from "../lib/auth";

/** Email dan role yang sedang masuk (Badge) dan tombol Keluar. Tidak tampil kalau belum masuk. */
export function UserMenu() {
  const { session } = useAuthState();
  if (!session) return null;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="max-w-[180px] truncate text-sm text-ink-soft sm:max-w-[260px]"
        title={session.email}
      >
        {session.email}
      </span>
      <Badge tone={session.role === "admin" ? "water" : "neutral"}>
        {session.role === "admin" ? "Admin" : "Viewer"}
      </Badge>
      <button
        type="button"
        onClick={() => endSession("logout")}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-line-soft hover:text-ink pointer-coarse:min-h-11"
      >
        <LogOut className="size-4" aria-hidden />
        Keluar
      </button>
    </div>
  );
}
