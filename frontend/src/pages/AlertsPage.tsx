import { PageHeader } from "../components/PageHeader";
import { PendingFeature } from "../components/PendingFeature";

/** Alerts: menunggu mapping register dan kalibrasi dari tim hardware. Tidak ada data di halaman ini. */
export function AlertsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Alerts" description="Peringatan saat nilai keluar dari batas normal." />
      <PendingFeature title="Alert belum tersedia">
        <p>
          Fitur ini menunggu mapping register dan kalibrasi dari tim hardware. Selama arti R1 sampai
          R7 belum diverifikasi, batas normal belum bisa ditetapkan, jadi belum ada nilai yang bisa
          dinilai berada di dalam atau di luar batas.
        </p>
        <p>Nilai mentah tiap paket tetap bisa dilihat di Data History.</p>
      </PendingFeature>
    </div>
  );
}
