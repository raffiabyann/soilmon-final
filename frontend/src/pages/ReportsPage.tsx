import { PageHeader } from "../components/PageHeader";
import { PendingFeature } from "../components/PendingFeature";

/** Reports: menunggu mapping register dan kalibrasi dari tim hardware. Tidak ada data di halaman ini. */
export function ReportsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Ringkasan per node dari data yang sudah terkalibrasi."
      />
      <PendingFeature title="Laporan belum tersedia">
        <p>
          Ringkasan min, rata-rata, dan maks butuh nilai yang sudah terkalibrasi. Fitur ini menunggu
          mapping register dan kalibrasi dari tim hardware, karena arti R1 sampai R7 belum
          diverifikasi.
        </p>
        <p>Paket mentah per node tetap bisa dilihat di Data History.</p>
      </PendingFeature>
    </div>
  );
}
