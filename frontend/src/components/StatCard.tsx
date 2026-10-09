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
  green: "bg-green-500/15 text-green-400",
  red: "bg-red-500/15 text-red-400",
  blue: "bg-blue-500/15 text-blue-400",
} as const;

export function StatCard({ icon: Icon, label, value, hint, tone = "blue" }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`rounded-lg p-3 ${TONE_CLASS[tone]}`}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
    </Card>
  );
}
