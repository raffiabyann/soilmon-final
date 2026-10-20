import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** false = tanpa padding, untuk kartu yang isinya menempel ke tepi. */
  padded?: boolean;
}

/** Kartu dasar (Figma: surface, garis line, radius 20, padding 28). Tanpa bayangan: kartu menempel di halaman. */
export function Card({ children, className = "", padded = true }: CardProps) {
  return (
    <div
      className={`rounded-[20px] border border-line bg-surface ${padded ? "p-5 md:p-7" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
