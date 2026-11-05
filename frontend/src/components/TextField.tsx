import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Keterangan kecil di bawah kolom, misalnya satuan. */
  hint?: ReactNode;
  /** Pesan kesalahan untuk kolom ini. */
  error?: string;
}

/** Kolom isian berlabel, gaya sama dengan pilihan di Data History. */
export function TextField({ label, hint, error, className = "", ...input }: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={className}>
      <label htmlFor={id} className="label-mono mb-1.5 block">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:bg-line-soft disabled:text-ink-soft pointer-coarse:min-h-11 ${
          error ? "border-danger" : "border-line"
        }`}
      />
      {note && (
        <p id={noteId} className={`mt-1.5 text-xs ${error ? "text-danger-ink" : "text-ink-muted"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
