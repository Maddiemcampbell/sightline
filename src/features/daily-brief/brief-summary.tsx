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
      className="border-border bg-surface mb-6 overflow-hidden rounded-xl border"
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="border-border border-b p-4 sm:border-r sm:p-5 xl:border-b-0"
          >
            <p className="text-muted text-xs font-semibold tracking-wide uppercase">
              {label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
