interface StatusBadgeProps {
  online: boolean;
}

export function StatusBadge({ online }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        online ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      <span className={`size-1.5 rounded-full ${online ? "bg-green-600" : "bg-red-600"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
