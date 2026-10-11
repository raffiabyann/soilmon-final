import { Outlet } from "react-router";
import { Rail } from "./Rail";
import { SidebarPanel } from "./SidebarPanel";
import { TopBar } from "./TopBar";
import { usePersistentFlag } from "../lib/theme";

/**
 * Kerangka semua halaman: sidebar (rail tertutup atau panel terbuka) + TopBar + isi halaman.
 * Pilihan buka/tutup sidebar disimpan di localStorage.
 */
export function AppLayout() {
  const [open, setOpen] = usePersistentFlag("soilmon-sidebar-open", false);

  return (
    <div className="flex min-h-screen gap-6 bg-canvas p-5 text-ink">
      {open ? (
        <SidebarPanel onClose={() => setOpen(false)} />
      ) : (
        <Rail onOpen={() => setOpen(true)} />
      )}
      <main className="min-w-0 flex-1">
        <TopBar />
        <div className="pt-5 pb-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
