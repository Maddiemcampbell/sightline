import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";

type BriefSummaryProps = Readonly<{
  totalProfitAtRiskCents: number;
  activeProjectCount: number;
  openRiskCount: number;
  overallRiskLevel: string;
}>;

export function BriefSummary(props: BriefSummaryProps) {
  const metrics = [
    ["Total profit at risk", formatMoney(props.totalProfitAtRiskCents)],
    ["Active projects", String(props.activeProjectCount)],
    ["Open risks", String(props.openRiskCount)],
    ["Overall risk level", props.overallRiskLevel],
  ];
  return (
    <section
      aria-label="Brief summary"
      className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map(([label, value]) => (
        <Card key={label} className="p-4 sm:p-5">
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {value}
          </p>
        </Card>
      ))}
    </section>
  );
}
