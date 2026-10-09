import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen gap-6 bg-canvas p-4 text-ink">
      <Sidebar />
      <main className="min-w-0 flex-1 py-2 pr-2">
        <TopBar />
        <div className="pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
