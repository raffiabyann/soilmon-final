import { METRIC_KEYS } from "@soilmon/shared";

export function App() {
  return (
    <main className="min-h-screen bg-green-50 p-8">
      <h1 className="text-3xl font-bold text-green-800">SoilMon</h1>
      <p className="mt-2 text-green-700">Dashboard sedang dibangun.</p>
      <p className="mt-4 text-sm text-gray-600">
        Metric terdaftar dari @soilmon/shared: {METRIC_KEYS.length}
      </p>
    </main>
  );
}
