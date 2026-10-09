import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-200">
      <Sidebar />
      <main className="flex-1 px-8 py-6">
        <TopBar />
        <div className="pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
