/**
 * Pita 4 logo mitra di bagian atas (permintaan tim).
 * Selama file logo belum ada, tampil kotak tempat logo dengan namanya.
 * Cara mengisi: taruh file di frontend/public/logos/, lalu isi `src`, misalnya "/logos/umn.png".
 */
interface PartnerLogo {
  name: string;
  src: string | null;
}

const PARTNER_LOGOS: readonly PartnerLogo[] = [
  { name: "Hiliriset", src: null },
  { name: "UMN", src: null },
  { name: "FTI", src: null },
  { name: "Dekatif", src: null },
];

export function LogoStrip() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {PARTNER_LOGOS.map((logo) =>
        logo.src ? (
          <img key={logo.name} src={logo.src} alt={logo.name} className="h-10 w-auto" />
        ) : (
          <div
            key={logo.name}
            className="flex h-10 w-24 items-center justify-center rounded-lg border border-dashed border-line bg-canvas text-xs text-ink-muted"
          >
            {logo.name}
          </div>
        ),
      )}
    </div>
  );
}
