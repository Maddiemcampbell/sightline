export type ReportCard = Readonly<{
  kind: "risk" | "financial";
  title: string;
  description: string;
  summary: string;
}>;

export function buildAvailableReportCards(input: {
  risk: {
    activeRisks: number;
    highCriticalRisks: number;
    quality: string;
  };
  financial: null | {
    projectsOverBudget: number;
    projectsMissingFinancialData: number;
    forecastConfidence: string;
  };
}): ReportCard[] {
  const cards: ReportCard[] = [
    {
      kind: "risk",
      title: "Risk Trends",
      description:
        "Current risk volume, severity, categories, and resolution outcomes across authorized projects.",
      summary: `${input.risk.activeRisks} active · ${input.risk.highCriticalRisks} high/critical · ${input.risk.quality} data`,
    },
  ];

  if (input.financial) {
    cards.push({
      kind: "financial",
      title: "Financial Performance",
      description:
        "Permission-aware portfolio financial performance based on approved calculations.",
      summary: `${input.financial.projectsOverBudget} over budget · ${input.financial.projectsMissingFinancialData} missing financial data · ${input.financial.forecastConfidence} forecast confidence`,
    });
  }

  return cards;
}
