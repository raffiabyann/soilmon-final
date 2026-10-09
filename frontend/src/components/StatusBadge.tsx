interface StatusBadgeProps {
  online: boolean;
}

export function StatusBadge({ online }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        online ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      <span className={`size-1.5 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
