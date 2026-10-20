import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "../lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Tema terang", icon: Sun },
  { value: "dark", label: "Tema gelap", icon: Moon },
];

/** Pil matahari/bulan (komponen Figma "ThemeToggle"). */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex gap-0.5 rounded-full bg-line-soft p-[3px]"
    >
      {OPTIONS.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.value)}
            className={`grid size-[30px] place-items-center pointer-coarse:size-11 rounded-full transition-colors ${
              active ? "bg-surface shadow-card" : "text-ink-muted hover:text-ink"
            } ${active && o.value === "light" ? "text-accent" : ""} ${
              active && o.value === "dark" ? "text-ink" : ""
            }`}
          >
            <o.icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
