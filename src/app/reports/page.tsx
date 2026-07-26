import {
  BarChart3,
  CircleDollarSign,
  FileChartColumn,
  ListChecks,
  ShieldAlert,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { getReportsData } from "@/features/reports/data";

const reports = [
  {
    title: "Executive Summary",
    description:
      "A concise leadership view of portfolio changes, priorities, and supporting evidence.",
    icon: FileChartColumn,
  },
  {
    title: "Portfolio Health",
    description:
      "Project-level health signals and patterns across authorized work.",
    icon: BarChart3,
  },
  {
    title: "Risk Trends",
    description:
      "Changes in risk volume, severity, categories, and resolution outcomes.",
    icon: ShieldAlert,
  },
  {
    title: "Overdue Actions",
    description:
      "Outstanding responses organized by project, owner, priority, and due date.",
    icon: ListChecks,
  },
  {
    title: "Financial Performance",
    description:
      "Permission-aware portfolio financial reporting once calculations are approved.",
    icon: CircleDollarSign,
  },
] as const;

export default async function ReportsPage() {
  const { financialAnalytics } = await getReportsData();
  const financialSummary = financialAnalytics
    ? `${financialAnalytics.portfolio.projectsOverBudget} over budget · ${financialAnalytics.portfolio.projectsMissingFinancialData} missing financial data · ${financialAnalytics.cashFlow.confidence} forecast confidence`
    : "Restricted for your role";
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          Reporting workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Reports
        </h1>
        <p className="text-muted mt-2 max-w-2xl leading-6">
          Reusable report definitions will live here. No unverified calculations
          or generated reports are presented in this foundation.
        </p>
      </header>
      <section
        aria-label="Available report definitions"
        className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {reports.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="flex min-h-52 flex-col">
            <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-md">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">{title}</h2>
            <p className="text-muted mt-2 flex-1 text-sm leading-6">
              {description}
            </p>
            <span className="text-muted border-border mt-5 border-t pt-4 text-xs font-semibold">
              {title === "Financial Performance"
                ? financialSummary
                : "Report generation coming later"}
            </span>
          </Card>
        ))}
      </section>
    </div>
  );
}
