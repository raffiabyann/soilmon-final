import { Outlet } from "react-router";
import { BottomNav } from "./BottomNav";
import { Rail } from "./Rail";
import { SidebarPanel } from "./SidebarPanel";
import { TopBar } from "./TopBar";
import { usePersistentFlag } from "../lib/theme";

/**
 * Kerangka semua halaman: sidebar (rail tertutup atau panel terbuka) + TopBar + isi halaman.
 * Sidebar hanya tampil dari md ke atas; di HP menunya pindah ke BottomNav.
 * Pilihan buka/tutup sidebar disimpan di localStorage.
 */
export function AppLayout() {
  const [open, setOpen] = usePersistentFlag("soilmon-sidebar-open", false);

  return (
    <div className="flex min-h-screen gap-3 bg-canvas p-3 text-ink md:gap-6 md:p-5">
      <div className="hidden md:contents">
        {open ? (
          <SidebarPanel onClose={() => setOpen(false)} />
        ) : (
          <Rail onOpen={() => setOpen(true)} />
        )}
      </div>
      <main className="min-w-0 flex-1 pb-16 md:pb-0">
        <TopBar />
        <div className="pt-5 pb-4">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
