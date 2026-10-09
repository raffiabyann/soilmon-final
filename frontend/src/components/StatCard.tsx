import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone?: "green" | "red" | "blue";
}

const TONE_CLASS = {
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
} as const;

export function StatCard({ icon: Icon, label, value, hint, tone = "blue" }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`rounded-lg p-3 ${TONE_CLASS[tone]}`}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
    </Card>
  );
}
