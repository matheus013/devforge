import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  const tones = {
    neutral: "border-neutral-300 bg-neutral-100 text-neutral-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}
