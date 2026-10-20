import { LogoStrip } from "./LogoStrip";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Baris paling atas: logo mitra di kiri, kredit pembuat di tengah, tombol tema di kanan.
 * Di bawah xl kredit turun ke baris sendiri supaya tidak berdesakan.
 */
export function TopBar() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 xl:grid xl:grid-cols-[1fr_auto_1fr]">
      <LogoStrip />
      <p className="order-last w-full text-center xl:order-none xl:w-auto">
        <span className="block text-xs text-ink-soft">Dikembangkan oleh</span>
        <span className="block text-sm font-semibold text-ink">
          Universitas Multimedia Nusantara &amp; PT. IDE Kreatif Teknologi
        </span>
      </p>
      <div className="flex items-center xl:justify-self-end">
        <ThemeToggle />
      </div>
    </header>
  );
}
