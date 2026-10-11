import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Harus sama dengan kunci di skrip kecil index.html. */
export const THEME_STORAGE_KEY = "soilmon-theme";

function readInitialTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Tema terang/gelap. index.html sudah memasang class `.dark` sebelum React jalan;
 * hook ini hanya membaca keadaan itu, lalu menyimpan pilihan baru ke localStorage.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage bisa diblokir (mode privat); tema tetap berlaku sampai halaman dimuat ulang.
    }
  }, []);

  return [theme, setTheme];
}

/** Simpan/baca boolean kecil di localStorage dengan aman (dipakai untuk sidebar terbuka). */
export function usePersistentFlag(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === "1";
    } catch {
      return initial;
    }
  });
  const update = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {
        // abaikan
      }
    },
    [key],
  );
  return [value, update];
}
