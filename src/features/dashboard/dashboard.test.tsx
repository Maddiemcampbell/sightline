import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/actions/action-controls", () => ({
  ActionControls: () => null,
}));

import { Dashboard } from "@/features/dashboard/dashboard";
import type { DashboardView } from "@/features/dashboard/types";

const view: DashboardView = {
  generatedAt: "2026-07-23T16:00:00.000Z",
  timezone: "America/Los_Angeles",
  currentUserName: "Matt Anderson",
  isEmptyOrganization: false,
  hasActiveRisks: true,
  observations: [],
  intelligence: {
    portfolioWatch: [],
    emergingPatterns: [],
    historicalComparisons: [],
    rootCauseSuggestions: [],
    executiveRecommendations: [],
  },
  overnight: {
    newRisks: { value: 2, previousValue: 1 },
    resolvedRisks: { value: 1, previousValue: 0 },
    overdueActions: { value: 3, previousValue: 2 },
    awaitingUser: { value: 2, previousValue: 2 },
    exposureDeltaCents: { value: 1_500_000, previousValue: null },
  },
  priorities: [
    {
      id: "risk:risk-1",
      kind: "risk",
      title: "Insurance renewal is late",
      projectId: "project-1",
      projectName: "Riverfront",
      reason: "critical severity",
      exposureCents: 5_000_000,
      ownerName: "Matt Anderson",
      dueAt: "2026-07-22T17:00:00.000Z",
      status: "action_needed",
      nextAction: "Open response",
      href: "/risks/risk-1",
      score: 90,
    },
  ],
  portfolio: [
    {
      id: "project-1",
      name: "Riverfront",
      location: "Stockton, CA",
      projectedMarginCents: 2_000_000,
      openRiskCount: 1,
      exposureCents: 5_000_000,
      trend: "up",
      topIssue: "Insurance renewal is late",
      concernScore: 25,
    },
  ],
  work: {
    dueToday: [],
    overdue: [],
    unownedRisks: [],
    waitingExternal: [],
    recentlyCompleted: [],
  },
  activity: [],
  value: {
    risksResolved: 1,
    estimatedExposureReducedCents: 4_000_000,
    estimatedLossAvoidedCents: null,
    averageResolutionHours: 24,
    actionCompletionRate: 50,
  },
  owners: [{ id: "user-1", name: "Matt Anderson" }],
};

describe("company dashboard", () => {
  it("renders the executive questions as accessible major sections", () => {
    const markup = renderToStaticMarkup(<Dashboard view={view} />);

    expect(markup).toContain("Good morning, Matt.");
    expect(markup).toContain("Portfolio Watch");
    expect(markup).toContain("Emerging Patterns");
    expect(markup).toContain("Similar to Last Quarter");
    expect(markup).toContain("Executive Recommendations");
    expect(markup).toContain("will not speculate from weak signals");
    expect(markup).toContain("hypotheses for investigation");
  });

  it("labels root-cause suggestions as hypotheses with assumptions", () => {
    const markup = renderToStaticMarkup(
      <Dashboard
        view={{
          ...view,
          intelligence: {
            ...view.intelligence,
            rootCauseSuggestions: [
              {
                key: "document-pattern",
                title: "Possible root cause: incomplete document coverage",
                hypothesis:
                  "Incomplete document coverage may be contributing to recurring risks.",
                confidence: 80,
                evidence: [
                  {
                    label: "Atlas",
                    value: "0 active documents",
                    entityType: "project",
                    entityId: "project-1",
                  },
                  {
                    label: "Beacon",
                    value: "2 unresolved risks",
                    entityType: "project",
                    entityId: "project-2",
                  },
                ],
                assumptions: ["Document metadata is current."],
                supportingObservations: [
                  { key: "one", title: "Document coverage gap" },
                  { key: "two", title: "Recurring documentation risks" },
                ],
                similarHistoricalCases: [],
                recommendedInvestigationSteps: [
                  "Confirm whether records exist outside Sightline.",
                ],
              },
            ],
            executiveRecommendations: [],
          },
        }}
      />,
    );

    expect(markup).toContain("Hypothesis — not a conclusion");
    expect(markup).toContain("80% hypothesis confidence");
    expect(markup).toContain("Assumptions to validate");
    expect(markup).toContain(
      "Confirm whether records exist outside Sightline.",
    );
  });

  it("renders the empty organization state with a next step", () => {
    const markup = renderToStaticMarkup(
      <Dashboard
        view={{
          ...view,
          isEmptyOrganization: true,
          priorities: [],
          portfolio: [],
        }}
      />,
    );

    expect(markup).toContain("Your portfolio is ready");
    expect(markup).toContain("Open projects");
  });
});
