import { Info } from "lucide-react";

/** Catatan tetap di setiap tempat yang menampilkan nilai hasil konversi R1 sampai R7. */
export function RawRegisterNote() {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl bg-line-soft px-4 py-2.5 text-sm text-ink-soft"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Nilai dihitung dengan mapping register dari firmware gateway. Mapping ini belum diverifikasi
        dengan datasheet sensor, jadi nilai mentah R1 sampai R7 tetap ditampilkan.
      </span>
    </p>
  );
}
