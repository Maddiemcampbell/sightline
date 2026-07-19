import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = Readonly<{
  label: string;
  value: string;
  detail?: string;
  trend?: ReactNode;
  className?: string;
}>;

export function MetricCard({
  label,
  value,
  detail,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("min-h-40", className)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted text-sm font-medium">{label}</p>
        {trend}
      </div>
      <p className="text-ink mt-5 text-3xl font-semibold tracking-[-0.04em]">
        {value}
      </p>
      {detail ? <p className="text-muted mt-2 text-sm">{detail}</p> : null}
    </Card>
  );
}
