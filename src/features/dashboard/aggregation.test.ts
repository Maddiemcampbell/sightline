import { describe, expect, it } from "vitest";

import {
  buildDashboardView,
  scoreRiskPriority,
} from "@/features/dashboard/aggregation";
import type { DashboardSource } from "@/features/dashboard/types";
import type {
  ProjectRow,
  RecommendedActionRow,
  RiskResolutionRow,
  RiskRow,
} from "@/lib/supabase/database-row.types";

const now = new Date("2026-07-23T16:00:00.000Z");

function risk(overrides: Partial<RiskRow> = {}): RiskRow {
  return {
    assigned_user_id: "user-1",
    category: "financial",
    confidence_score: 80,
    created_at: "2026-07-20T12:00:00.000Z",
    detected_at: "2026-07-20T12:00:00.000Z",
    detection_key: null,
    due_at: "2026-07-26T17:00:00.000Z",
    estimated_margin_impact_cents: 2_000_000,
    id: "risk-1",
    organization_id: "org-1",
    potential_exposure_cents: 5_000_000,
    project_id: "project-1",
    resolved_at: null,
    severity: "medium",
    status: "monitoring",
    summary: "Summary",
    title: "Base risk",
    updated_at: "2026-07-20T12:00:00.000Z",
    updated_by_user_id: null,
    vendor_id: null,
    why_it_matters: "Margin may be affected.",
    ...overrides,
  };
}

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    address_line_1: null,
    city: "Stockton",
    contract_value_cents: 10_000_000,
    created_at: "2026-01-01T00:00:00.000Z",
    id: "project-1",
    image_url: null,
    name: "Riverfront",
    organization_id: "org-1",
    postal_code: null,
    project_number: "P-1",
    projected_margin_cents: 1_000_000,
    start_date: null,
    state_code: "CA",
    status: "active",
    target_completion_date: null,
    updated_at: "2026-07-20T00:00:00.000Z",
    updated_by_user_id: null,
    ...overrides,
  };
}

function action(
  overrides: Partial<RecommendedActionRow> = {},
): RecommendedActionRow {
  return {
    action_type: "contact_vendor",
    completed_at: null,
    created_at: "2026-07-20T00:00:00.000Z",
    created_by_user_id: "user-1",
    description: "Contact the vendor.",
    detection_key: null,
    dismissed_at: null,
    dismissal_reason: null,
    due_at: "2026-07-22T17:00:00.000Z",
    id: "action-1",
    organization_id: "org-1",
    owner_user_id: "user-1",
    priority: "high",
    risk_id: "risk-1",
    source: "deterministic_rule",
    status: "accepted",
    title: "Confirm recovery plan",
    updated_at: "2026-07-20T00:00:00.000Z",
    updated_by_user_id: null,
    ...overrides,
  };
}

function source(overrides: Partial<DashboardSource> = {}): DashboardSource {
  return {
    now,
    currentUserId: "user-1",
    currentUser: { id: "user-1", full_name: "Matt Anderson" },
    projects: [project()],
    risks: [risk()],
    actions: [action()],
    activities: [],
    resolutions: [],
    users: [{ id: "user-1", full_name: "Matt Anderson" }],
    ...overrides,
  };
}

describe("dashboard prioritization", () => {
  it("ranks critical, overdue, unowned, escalated exposure above routine risk", () => {
    const routine = risk();
    const urgent = risk({
      assigned_user_id: null,
      due_at: "2026-07-22T17:00:00.000Z",
      potential_exposure_cents: 30_000_000,
      severity: "critical",
      status: "action_needed",
    });

    expect(scoreRiskPriority(urgent, now, true)).toBeGreaterThan(
      scoreRiskPriority(routine, now, false),
    );
  });

  it("uses stable deterministic ordering when scores match", () => {
    const view = buildDashboardView(
      source({
        risks: [
          risk({ id: "risk-b", title: "Zulu" }),
          risk({ id: "risk-a", title: "Alpha" }),
        ],
        actions: [],
      }),
      "America/Los_Angeles",
    );

    expect(view.priorities.map((item) => item.title)).toEqual([
      "Alpha",
      "Zulu",
    ]);
  });
});

describe("dashboard aggregation", () => {
  it("aggregates action queues, portfolio exposure, and conservative value", () => {
    const resolution: RiskResolutionRow = {
      completed_action_ids: [],
      created_at: "2026-07-23T15:00:00.000Z",
      estimated_loss_avoided_cents: 2_000_000,
      exposure_before_cents: 5_000_000,
      final_owner_user_id: "user-1",
      id: "resolution-1",
      initial_prediction: {},
      internal_notes: null,
      organization_id: "org-1",
      prediction_accurate: true,
      realized_impact_cents: null,
      remaining_exposure_cents: 1_000_000,
      reopen_reason: null,
      reopened_at: null,
      resolved_at: "2026-07-23T15:00:00.000Z",
      resolved_by_user_id: "user-1",
      resolved_date: "2026-07-23",
      resolution_type: "mitigated",
      risk_id: "risk-resolved",
      summary: "The team mitigated the issue.",
      warning_useful: true,
    };
    const view = buildDashboardView(
      source({
        risks: [
          risk(),
          risk({
            id: "risk-resolved",
            status: "resolved",
            resolved_at: "2026-07-23T15:00:00.000Z",
          }),
        ],
        resolutions: [resolution],
      }),
      "America/Los_Angeles",
    );

    expect(view.work.overdue).toHaveLength(1);
    expect(view.portfolio[0]).toMatchObject({
      openRiskCount: 1,
      exposureCents: 5_000_000,
    });
    expect(view.portfolioSummary).toEqual({
      activeProjects: 1,
      projectsAtRisk: 1,
      totalExposureCents: 5_000_000,
      forecastMarginPercent: null,
    });
    expect(view.riskDrivers[0]).toMatchObject({
      category: "financial",
      label: "Financial",
      riskCount: 1,
      level: "medium",
    });
    expect(view.riskHeatmap[0]?.cells.budget).toBe("medium");
    expect(view.value).toMatchObject({
      risksResolved: 1,
      estimatedExposureReducedCents: 4_000_000,
      estimatedLossAvoidedCents: 2_000_000,
    });
  });

  it("returns honest empty and incomplete-data states", () => {
    const view = buildDashboardView(
      source({ projects: [], risks: [], actions: [], resolutions: [] }),
      "America/Los_Angeles",
    );

    expect(view.isEmptyOrganization).toBe(true);
    expect(view.hasActiveRisks).toBe(false);
    expect(view.value.averageResolutionHours).toBeNull();
    expect(view.value.actionCompletionRate).toBeNull();
    expect(view.value.estimatedLossAvoidedCents).toBeNull();
  });
});
