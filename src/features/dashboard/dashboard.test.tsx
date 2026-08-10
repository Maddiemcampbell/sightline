import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/actions/action-controls", () => ({
  ActionControls: () => null,
}));

import { Dashboard, filterDashboardView } from "@/features/dashboard/dashboard";
import type { DashboardView } from "@/features/dashboard/types";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { SharedAskProvider } from "@/features/ask-sightline/shared-ask-provider";

function TestDashboard({ view }: { view: DashboardView }) {
  return (
    <WorkspaceProvider
      organizationId="organization-1"
      userId="user-1"
      canUseAi
      projects={view.portfolio.map(({ id, name }) => ({ id, name }))}
      searchResources={[]}
    >
      <SharedAskProvider storageIdentity="user-1:organization-1">
        <Dashboard view={view} />
      </SharedAskProvider>
    </WorkspaceProvider>
  );
}

const view: DashboardView = {
  generatedAt: "2026-07-23T16:00:00.000Z",
  timezone: "America/Los_Angeles",
  currentUserName: "Matt Anderson",
  canViewFinancials: true,
  financialAnalytics: null,
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
      contractValueCents: 16_000_000,
      projectedMarginCents: 2_000_000,
      openRiskCount: 1,
      exposureCents: 5_000_000,
      trend: "up",
      topIssue: "Insurance renewal is late",
      concernScore: 25,
    },
  ],
  portfolioSummary: {
    activeProjects: 1,
    projectsAtRisk: 1,
    totalExposureCents: 5_000_000,
    forecastMarginPercent: 12.7,
  },
  riskDrivers: [
    {
      category: "financial",
      label: "Financial",
      riskCount: 1,
      exposureCents: 5_000_000,
      level: "high",
    },
  ],
  riskHeatmap: [
    {
      projectId: "project-1",
      projectName: "Riverfront",
      cells: {
        schedule: null,
        budget: "high",
        resources: null,
        contracts: null,
        design: null,
      },
    },
  ],
  work: {
    dueToday: [],
    overdue: [],
    overdueExposureCents: 0,
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
  it("applies one project selection across dashboard modules", () => {
    const filtered = filterDashboardView(
      {
        ...view,
        portfolio: [
          ...view.portfolio,
          {
            ...view.portfolio[0]!,
            id: "project-2",
            name: "Beacon",
            openRiskCount: 0,
            exposureCents: 0,
          },
        ],
        riskHeatmap: [
          ...view.riskHeatmap,
          {
            ...view.riskHeatmap[0]!,
            projectId: "project-2",
            projectName: "Beacon",
          },
        ],
      },
      "project-2",
    );

    expect(filtered.portfolio.map(({ id }) => id)).toEqual(["project-2"]);
    expect(filtered.riskHeatmap.map(({ projectId }) => projectId)).toEqual([
      "project-2",
    ]);
    expect(filtered.priorities).toEqual([]);
    expect(filtered.portfolioSummary.projectsAtRisk).toBe(0);
  });

  it("renders the executive portfolio workspace from real view data", () => {
    const markup = renderToStaticMarkup(<TestDashboard view={view} />);

    expect(markup).toContain("Good morning, Matt.");
    expect(markup).toContain("Portfolio home");
    expect(markup).toContain("Since your last visit");
    expect(markup).toContain("Needs attention");
    expect(markup).toContain("Portfolio Watch");
    expect(markup).toContain("Portfolio overview");
    expect(markup).toContain("Top risk drivers");
    expect(markup).toContain("Risk hotspots");
    expect(markup).toContain("Response readiness");
    expect(markup).toContain("Recent intelligence");
    expect(markup).toContain("Overdue actions");
    expect(markup).toContain("AI assistant");
    expect(markup).toContain("Quick paths");
    expect(markup).toContain("12.7%");
    expect(markup).toContain("Financial");
  });

  it("presents zero signals and unavailable margin without visual emphasis", () => {
    const markup = renderToStaticMarkup(
      <TestDashboard
        view={{
          ...view,
          portfolioSummary: {
            ...view.portfolioSummary,
            forecastMarginPercent: null,
          },
        }}
      />,
    );

    expect(markup).toContain(
      "No portfolio signals currently require executive attention.",
    );
    expect(markup).not.toContain("0 portfolio signals");
    const forecastMetric = markup.slice(
      markup.indexOf("Forecasted margin"),
      markup.indexOf("Forecasted margin") + 800,
    );
    expect(forecastMetric).not.toContain("Not available");
    expect(markup).toContain("No active-project forecast for this scope");
  });

  it("labels root-cause suggestions as hypotheses rather than conclusions", () => {
    const markup = renderToStaticMarkup(
      <TestDashboard
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
    expect(markup).toContain("80% confidence");
    expect(markup).toContain("Review assumptions before acting");
  });

  it("does not render portfolio exposure for a restricted role", () => {
    const observation = {
      key: "restricted",
      type: "overdue_actions" as const,
      title: "Three actions are overdue",
      summary: "Follow-through is overdue.",
      supportingEvidence: [],
      confidence: 100,
      affectedProjectIds: ["project-1"],
      affectedProjects: [{ id: "project-1", name: "Riverfront" }],
      businessImpactEstimateCents: null,
      businessImpactExplanation:
        "Financial impact is hidden because this role does not have permission.",
      recommendedNextStep: "Review action owners.",
      algorithmVersion: "test",
    };
    const markup = renderToStaticMarkup(
      <TestDashboard
        view={{
          ...view,
          canViewFinancials: false,
          observations: [observation],
          intelligence: {
            ...view.intelligence,
            portfolioWatch: [observation],
          },
        }}
      />,
    );

    expect(markup).not.toContain("Budget variance");
    expect(markup).not.toContain("Forecasted margin");
    expect(markup).not.toContain("Restricted");
    expect(markup).not.toContain("$");
  });

  it("renders the empty organization state with a next step", () => {
    const markup = renderToStaticMarkup(
      <TestDashboard
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
