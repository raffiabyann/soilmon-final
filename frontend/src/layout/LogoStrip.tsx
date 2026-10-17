/**
 * Pita logo mitra di bagian atas (permintaan tim).
 * File logo ada di frontend/public/logos/ (PNG, latar transparan, tinggi 96 px).
 * Logo tanpa file (`src: null`) tampil sebagai kotak bergaris putus-putus berisi namanya.
 *
 * Logo ditaruh di "chip" berlatar putih di kedua tema, karena warna asli logo
 * (teks hitam/biru tua) tidak terbaca di latar gelap. Ini satu-satunya warna di luar token,
 * sengaja, supaya logo mitra tidak diubah warnanya.
 */
interface PartnerLogo {
  name: string;
  src: string | null;
}

const PARTNER_LOGOS: readonly PartnerLogo[] = [
  { name: "Hiliriset", src: "/logos/hiliriset.png" },
  { name: "UMN", src: "/logos/umn.png" },
  { name: "FTI", src: "/logos/fti.png" },
  { name: "Dekatif", src: "/logos/dekatif.png" },
];

export function LogoStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2.5" aria-label="Mitra">
      {PARTNER_LOGOS.map((logo) =>
        logo.src ? (
          <span
            key={logo.name}
            className="flex h-12 items-center rounded-[10px] border border-line bg-white px-3"
          >
            <img src={logo.src} alt={logo.name} className="h-9 w-auto" />
          </span>
        ) : (
          <div
            key={logo.name}
            className="flex h-12 w-24 items-center justify-center rounded-[10px] border border-dashed border-line text-xs text-ink-muted"
          >
            {logo.name}
          </div>
        ),
      )}
    </div>
  );
}
