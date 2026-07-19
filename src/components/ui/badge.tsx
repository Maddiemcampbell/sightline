import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      status: {
        active: "bg-soft-green text-deep-green",
        pending: "bg-soft-amber text-warning",
        neutral: "bg-background text-muted ring-1 ring-inset ring-border",
        complete: "bg-soft-blue text-info",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  },
);

type StatusBadgeProps = ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants>;

export function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    />
  );
}

const riskBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      level: {
        high: "bg-soft-red text-danger",
        medium: "bg-soft-amber text-warning",
        low: "bg-soft-green text-deep-green",
      },
    },
    defaultVariants: {
      level: "low",
    },
  },
);

type RiskBadgeProps = ComponentProps<"span"> &
  VariantProps<typeof riskBadgeVariants>;

export function RiskBadge({ className, level, ...props }: RiskBadgeProps) {
  return (
    <span className={cn(riskBadgeVariants({ level }), className)} {...props}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {props.children}
    </span>
  );
}
