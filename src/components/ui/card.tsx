import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-border bg-surface shadow-surface rounded-lg border p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}
