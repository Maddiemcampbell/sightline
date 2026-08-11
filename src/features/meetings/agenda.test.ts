import { describe, expect, it } from "vitest";

import { buildMeetingAgenda } from "@/features/meetings/agenda";
import type { ForecastingView } from "@/features/forecasting/types";

describe("meeting agenda", () => {
  it("builds a deterministic, source-linked agenda from selected projects", () => {
    const agenda = buildMeetingAgenda({
      meetingType: "weekly_executive_review",
      projectIds: ["20000000-0000-4000-8000-000000000001"],
      forecast: fixture(),
    });
    expect(agenda.map((item) => item.section)).toEqual([
      "opening",
      "attention",
      "decisions",
      "commitments",
      "closeout",
    ]);
    expect(agenda.find((item) => item.section === "attention")).toMatchObject({
      title: "Cedar Grove",
      sourceHref: "/projects/20000000-0000-4000-8000-000000000001",
    });
    expect(JSON.stringify(agenda)).not.toContain("Riverfront action");
  });
});

function fixture(): ForecastingView {
  return {
    canViewFinancials: true,
    generatedAt: "2026-08-11T12:00:00.000Z",
    currencyCode: "USD",
    portfolio: null,
    cash: null,
    projects: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        name: "Cedar Grove",
        currencyCode: "USD",
        quality: "complete",
        budgetVarianceCents: -10000,
        budgetVariancePercent: -2,
        forecastMarginPercent: 8,
        estimateAtCompletionCents: 1,
        forecastCostToCompleteCents: 1,
        pendingChangeOrdersCents: 0,
        targetCompletionDate: null,
        scheduleRiskCount: 1,
        highestScheduleSeverity: "high",
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        name: "Riverfront",
        currencyCode: "USD",
        quality: "complete",
        budgetVarianceCents: 0,
        budgetVariancePercent: 0,
        forecastMarginPercent: 10,
        estimateAtCompletionCents: 1,
        forecastCostToCompleteCents: 1,
        pendingChangeOrdersCents: 0,
        targetCompletionDate: null,
        scheduleRiskCount: 0,
        highestScheduleSeverity: null,
      },
    ],
    worseningRisks: [
      {
        id: "60000000-0000-4000-8000-000000000001",
        projectId: "20000000-0000-4000-8000-000000000001",
        title: "Insurance expiry",
        category: "compliance",
        severity: "high",
        attentionScore: 90,
        exposureCents: null,
        href: "/risks/60000000-0000-4000-8000-000000000001",
      },
    ],
    worseningDrivers: [],
    commitments: [
      {
        id: "80000000-0000-4000-8000-000000000001",
        title: "Cedar action",
        projectName: "Cedar Grove",
        dueAt: "2026-08-12T12:00:00.000Z",
        priority: "high",
        ownerName: "Matt",
        href: "/actions",
      },
      {
        id: "80000000-0000-4000-8000-000000000002",
        title: "Riverfront action",
        projectName: "Riverfront",
        dueAt: "2026-08-12T12:00:00.000Z",
        priority: "high",
        ownerName: "Matt",
        href: "/actions",
      },
    ],
    readiness: {
      confidence: "low",
      missingInputs: [],
      projectsWithoutCompletionDate: 2,
      projectsMissingFinancialData: 0,
    },
  };
}
