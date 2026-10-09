import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Kotak dasar tema terang; dipakai semua halaman supaya tampilannya seragam. */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
