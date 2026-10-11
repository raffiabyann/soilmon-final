import type { ReactNode } from "react";

/** Label kecil gaya "instrumen" (Figma: Label/Mono). Bisa diberi ikon di depannya. */
export function CardLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`label-mono flex items-center gap-1.5 ${className}`}>{children}</p>;
}
