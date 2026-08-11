import { describe, expect, it } from "vitest";

import { evaluateExceptions } from "./evaluate";

const settings = {
  marginEnabled: true,
  marginFloorPercent: 8,
  budgetEnabled: true,
  budgetVariancePercent: 5,
  unownedRiskEnabled: true,
  actionDueEnabled: true,
  actionDueDays: 3,
  documentExpiryEnabled: true,
  documentExpiryDays: 30,
  syncStaleEnabled: true,
  syncStaleHours: 24,
  forecastStaleEnabled: true,
  forecastStaleDays: 14,
} as const;

describe("evaluateExceptions", () => {
  it("creates deterministic exceptions only when configured thresholds are crossed", () => {
    const alerts = evaluateExceptions({
      now: new Date("2026-08-11T12:00:00Z"),
      settings,
      projects: [
        {
          id: "p1",
          name: "Cedar Grove",
          contractValueCents: 1_000_000,
          projectedMarginCents: 50_000,
        },
      ],
      financials: [
        {
          projectId: "p1",
          originalBudgetCents: 800_000,
          actualCostCents: 700_000,
          forecastCostToCompleteCents: 200_000,
          dataAsOfDate: "2026-07-01",
        },
      ],
      approvedChanges: [],
      risks: [
        {
          id: "r1",
          title: "Insurance certificate",
          severity: "critical",
          assignedUserId: null,
          status: "action_needed",
        },
      ],
      actions: [
        {
          id: "a1",
          title: "Request certificate",
          dueAt: "2026-08-10T12:00:00Z",
          status: "accepted",
        },
      ],
      documents: [
        { id: "d1", name: "Insurance certificate", expiresOn: "2026-08-15" },
      ],
      connections: [
        {
          id: "c1",
          provider: "procore",
          companyName: "BuildCo",
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
          lastSuccessfulSyncAt: "2026-08-09T00:00:00Z",
        },
      ],
    });
    expect(new Set(alerts.map((alert) => alert.ruleType))).toEqual(
      new Set([
        "margin_below_target",
        "budget_variance",
        "forecast_inputs_stale",
        "unowned_high_risk",
        "action_due",
        "document_expiring",
        "sync_stale",
      ]),
    );
    expect(alerts.every((alert) => alert.fingerprint.length > 0)).toBe(true);
  });

  it("returns no alerts for healthy inputs", () => {
    expect(
      evaluateExceptions({
        now: new Date("2026-08-11T12:00:00Z"),
        settings,
        projects: [
          {
            id: "p1",
            name: "Healthy",
            contractValueCents: 1_000_000,
            projectedMarginCents: 120_000,
          },
        ],
        financials: [
          {
            projectId: "p1",
            originalBudgetCents: 900_000,
            actualCostCents: 400_000,
            forecastCostToCompleteCents: 400_000,
            dataAsOfDate: "2026-08-10",
          },
        ],
        approvedChanges: [],
        risks: [],
        actions: [],
        documents: [],
        connections: [],
      }),
    ).toEqual([]);
  });
});
