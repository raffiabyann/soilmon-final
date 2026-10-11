import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** false = tanpa padding, untuk kartu yang isinya menempel ke tepi. */
  padded?: boolean;
}

/** Kartu dasar (Figma: surface, garis line, radius 20, Shadow/Card, padding 28). */
export function Card({ children, className = "", padded = true }: CardProps) {
  return (
    <div
      className={`rounded-[20px] border border-line bg-surface shadow-card ${padded ? "p-7" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
