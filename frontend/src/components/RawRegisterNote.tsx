import { Info } from "lucide-react";

/** Catatan tetap di setiap tempat yang menampilkan R1 sampai R7: nilainya belum bermakna. */
export function RawRegisterNote() {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl bg-line-soft px-4 py-2.5 text-sm text-ink-soft"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        R1 sampai R7 adalah register mentah dari node (bilangan bulat 0 sampai 65535) dan belum
        dikalibrasi. Arti, skala, dan satuan register belum diverifikasi, jadi nilainya tidak diubah
        menjadi suhu, kelembapan, atau pH.
      </span>
    </p>
  );
}
