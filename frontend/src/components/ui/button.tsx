import * as React from "react";

import { cn } from "@/lib/utils";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50",
        props.className,
      )}
    />
  );
}
