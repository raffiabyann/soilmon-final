import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** false = tanpa padding, untuk kartu yang grafiknya menempel ke tepi. */
  padded?: boolean;
}

/** Kotak dasar tema terang; dipakai semua halaman supaya tampilannya seragam. */
export function Card({ children, className = "", padded = true }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface shadow-sm ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
