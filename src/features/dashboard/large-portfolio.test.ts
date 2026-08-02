import { describe, expect, it } from "vitest";

import { buildDashboardView } from "@/features/dashboard/aggregation";
import {
  calculatePortfolioRiskAnalytics,
  calculateRiskAnalyticsByProject,
} from "@/features/risk-analytics/calculations";
import type { ProjectRow, RiskRow } from "@/lib/supabase/database-row.types";

function createProjects(count: number): ProjectRow[] {
  return Array.from({ length: count }, (_, index) => ({
    address_line_1: null,
    archived_at: null,
    archived_by_user_id: null,
    city: "Sacramento",
    contract_value_cents: 10_000_000,
    created_at: "2026-01-01T00:00:00.000Z",
    id: `project-${index}`,
    image_url: null,
    name: `Project ${index}`,
    organization_id: "organization-1",
    postal_code: null,
    project_number: `P-${index}`,
    projected_margin_cents: 1_000_000,
    start_date: null,
    state_code: "CA",
    status: "active",
    target_completion_date: null,
    updated_at: "2026-07-28T00:00:00.000Z",
    updated_by_user_id: null,
  }));
}

function createRisks(count: number, projectCount: number): RiskRow[] {
  return Array.from({ length: count }, (_, index) => ({
    assigned_user_id: null,
    category: "schedule",
    confidence_score: 75,
    created_at: "2026-07-28T00:00:00.000Z",
    detected_at: "2026-07-28T00:00:00.000Z",
    detection_key: null,
    due_at: null,
    estimated_margin_impact_cents: 50_000,
    id: `risk-${index}`,
    organization_id: "organization-1",
    potential_exposure_cents: 100_000,
    project_id: `project-${index % projectCount}`,
    resolved_at: null,
    severity: "medium",
    status: "monitoring",
    summary: "A schedule risk requires review.",
    title: `Schedule risk ${index}`,
    updated_at: "2026-07-28T00:00:00.000Z",
    updated_by_user_id: null,
    vendor_id: null,
    why_it_matters: "The issue may affect estimated project margin.",
  }));
}

describe("large portfolio dashboard", () => {
  it("aggregates 1,200 projects and 2,400 risks without dropping portfolio records", () => {
    const projects = createProjects(1_200);
    const risks = createRisks(2_400, projects.length);

    const view = buildDashboardView(
      {
        now: new Date("2026-07-28T12:00:00.000Z"),
        currentUserId: "user-1",
        currentUser: { id: "user-1", full_name: "Matt Anderson" },
        projects,
        risks,
        actions: [],
        activities: [],
        resolutions: [],
        users: [{ id: "user-1", full_name: "Matt Anderson" }],
      },
      "America/Los_Angeles",
    );

    expect(view.portfolio).toHaveLength(1_200);
    expect(view.portfolioSummary).toMatchObject({
      activeProjects: 1_200,
      projectsAtRisk: 1_200,
      totalExposureCents: 240_000_000,
    });
  });

  it("benchmarks partitioned project analytics against the legacy repeated scan", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    const projects = createProjects(200);
    const risks = createRisks(2_000, projects.length);
    const common = {
      now,
      projects,
      risks,
      actions: [],
      evidence: [],
      canViewFinancials: true,
    } as const;

    const legacyStartedAt = performance.now();
    const legacy = Object.fromEntries(
      projects.map((project) => [
        project.id,
        calculatePortfolioRiskAnalytics({
          ...common,
          filters: { projectIds: [project.id] },
        }),
      ]),
    );
    const legacyDurationMs = performance.now() - legacyStartedAt;

    const partitionedStartedAt = performance.now();
    const partitioned = calculateRiskAnalyticsByProject(common);
    const partitionedDurationMs = performance.now() - partitionedStartedAt;

    expect(
      Object.fromEntries(
        Object.entries(partitioned).map(([projectId, analytics]) => [
          projectId,
          analytics.summary,
        ]),
      ),
    ).toEqual(
      Object.fromEntries(
        Object.entries(legacy).map(([projectId, analytics]) => [
          projectId,
          analytics.summary,
        ]),
      ),
    );
    console.info("[dashboard-aggregation-benchmark]", {
      projects: projects.length,
      risks: risks.length,
      legacyDurationMs: Math.round(legacyDurationMs * 10) / 10,
      partitionedDurationMs: Math.round(partitionedDurationMs * 10) / 10,
      improvementPercent:
        Math.round((1 - partitionedDurationMs / legacyDurationMs) * 1_000) / 10,
    });
  });
});
