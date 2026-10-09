import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Kotak dasar gaya gelap; dipakai semua halaman supaya tampilannya seragam. */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900 p-5 ${className}`}>
      {children}
    </div>
  );
}
