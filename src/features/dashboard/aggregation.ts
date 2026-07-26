import { calculateResolutionValueSummary } from "@/domain/resolutions";
import type { ActionView } from "@/features/actions/types";
import type {
  DashboardSource,
  DashboardView,
  PortfolioHealthRow,
  PriorityItem,
} from "@/features/dashboard/types";
import { sumMoneyCents } from "@/features/financial-analytics/calculations";

const DAY_MS = 86_400_000;
const terminalRiskStatuses = new Set(["resolved", "dismissed"]);
const terminalActionStatuses = new Set(["completed", "dismissed"]);
const severityRank = { low: 1, medium: 2, high: 3, critical: 4 } as const;

function riskGroup(category: DashboardSource["risks"][number]["category"]) {
  if (category === "schedule" || category === "weather") return "schedule";
  if (category === "financial") return "budget";
  if (category === "vendor" || category === "safety") return "resources";
  if (["contract", "insurance"].includes(category)) return "contracts";
  return "design";
}

function labelCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toActionView(
  row: DashboardSource["actions"][number],
  ownerName: string | null,
): ActionView {
  return {
    id: row.id,
    riskId: row.risk_id,
    title: row.title,
    description: row.description,
    actionType: row.action_type,
    status: row.status,
    priority: row.priority,
    ownerUserId: row.owner_user_id,
    ownerName,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    dismissedAt: row.dismissed_at,
    dismissalReason: row.dismissal_reason,
    source: row.source,
  };
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function inWindow(value: string | null, from: number, to: number) {
  if (!value) return false;
  const time = Date.parse(value);
  return time >= from && time < to;
}

function formatReason(parts: readonly string[]) {
  return parts.slice(0, 2).join(" · ");
}

/**
 * Deterministic executive-attention score.
 *
 * Risk factors: severity (0–40), exposure (0–25), due urgency (0–20),
 * missing owner (12), recent escalation (10), confidence (0–8), and status
 * (0–8). Overdue actions score 44–74 based on lateness, priority, ownership,
 * and whether work has started. Stable title/id tie-breakers are applied later.
 */
export function scoreRiskPriority(
  risk: DashboardSource["risks"][number],
  now: Date,
  escalated: boolean,
) {
  const severity = { low: 4, medium: 14, high: 28, critical: 40 } as const;
  const exposure = Math.min(25, risk.potential_exposure_cents / 2_000_000);
  const dueMs = risk.due_at ? Date.parse(risk.due_at) - now.getTime() : null;
  const due =
    dueMs === null
      ? 0
      : dueMs < 0
        ? 20
        : dueMs <= DAY_MS
          ? 16
          : dueMs <= 7 * DAY_MS
            ? 9
            : 0;
  const ownership = risk.assigned_user_id ? 0 : 12;
  const escalation = escalated ? 10 : 0;
  const confidence = (risk.confidence_score / 100) * 8;
  const status =
    risk.status === "action_needed" ? 8 : risk.status === "in_progress" ? 4 : 0;
  return Math.round(
    severity[risk.severity] +
      exposure +
      due +
      ownership +
      escalation +
      confidence +
      status,
  );
}

function scoreActionPriority(
  action: DashboardSource["actions"][number],
  now: Date,
) {
  const overdueDays = action.due_at
    ? Math.max(0, (now.getTime() - Date.parse(action.due_at)) / DAY_MS)
    : 0;
  const priority = { low: 2, normal: 7, high: 14, urgent: 20 } as const;
  return Math.round(
    40 +
      Math.min(20, overdueDays * 3) +
      priority[action.priority] +
      (action.owner_user_id ? 0 : 8) +
      (action.status === "in_progress" ? 0 : 6),
  );
}

export function buildDashboardView(
  source: DashboardSource,
  timezone: string,
): DashboardView {
  const today = startOfDay(source.now);
  const yesterday = today - DAY_MS;
  const tomorrow = today + DAY_MS;
  const now = source.now.getTime();
  const projectById = new Map(
    source.projects.map((project) => [project.id, project]),
  );
  const riskById = new Map(source.risks.map((risk) => [risk.id, risk]));
  const userById = new Map(
    source.users.map((user) => [user.id, user.full_name]),
  );
  const openRisks = source.risks.filter(
    (risk) => !terminalRiskStatuses.has(risk.status),
  );
  const openActions = source.actions.filter(
    (action) => !terminalActionStatuses.has(action.status),
  );
  const activeProjects = source.projects.filter(
    (project) => project.status === "active",
  );
  const projectsAtRisk = new Set(
    openRisks.flatMap((risk) => (risk.project_id ? [risk.project_id] : [])),
  ).size;
  const driverGroups = new Map<
    string,
    { riskCount: number; exposureCents: number; maxSeverity: number }
  >();
  for (const risk of openRisks) {
    const current = driverGroups.get(risk.category) ?? {
      riskCount: 0,
      exposureCents: 0,
      maxSeverity: 0,
    };
    driverGroups.set(risk.category, {
      riskCount: current.riskCount + 1,
      exposureCents: current.exposureCents + risk.potential_exposure_cents,
      maxSeverity: Math.max(current.maxSeverity, severityRank[risk.severity]),
    });
  }
  const riskDrivers = [...driverGroups.entries()]
    .map(([category, values]) => ({
      category,
      label: labelCategory(category),
      riskCount: values.riskCount,
      exposureCents: values.exposureCents,
      level:
        values.maxSeverity >= severityRank.high
          ? ("high" as const)
          : values.maxSeverity >= severityRank.medium
            ? ("medium" as const)
            : ("low" as const),
    }))
    .toSorted(
      (left, right) =>
        right.riskCount - left.riskCount ||
        right.exposureCents - left.exposureCents ||
        left.label.localeCompare(right.label),
    )
    .slice(0, 5);
  const riskHeatmap = activeProjects.slice(0, 6).map((project) => {
    const cells: Record<
      "schedule" | "budget" | "resources" | "contracts" | "design",
      "critical" | "high" | "medium" | "low" | null
    > = {
      schedule: null,
      budget: null,
      resources: null,
      contracts: null,
      design: null,
    };
    for (const risk of openRisks.filter(
      (candidate) => candidate.project_id === project.id,
    )) {
      const group = riskGroup(risk.category);
      const current = cells[group];
      if (!current || severityRank[risk.severity] > severityRank[current])
        cells[group] = risk.severity;
    }
    return { projectId: project.id, projectName: project.name, cells };
  });
  const actionViews = source.actions.map((action) =>
    toActionView(
      action,
      action.owner_user_id
        ? (userById.get(action.owner_user_id) ?? null)
        : null,
    ),
  );
  const actionViewById = new Map(
    actionViews.map((action) => [action.id, action]),
  );

  const todayResolutions = source.resolutions.filter(
    (resolution) =>
      !resolution.reopened_at &&
      inWindow(resolution.resolved_at, today, tomorrow),
  );
  const yesterdayResolutions = source.resolutions.filter(
    (resolution) =>
      !resolution.reopened_at &&
      inWindow(resolution.resolved_at, yesterday, today),
  );
  const exposureChange = (
    from: number,
    to: number,
    resolutions: typeof source.resolutions,
  ) =>
    source.risks
      .filter((risk) => inWindow(risk.detected_at, from, to))
      .reduce((sum, risk) => sum + risk.potential_exposure_cents, 0) -
    resolutions.reduce(
      (sum, resolution) =>
        sum +
        Math.max(
          0,
          resolution.exposure_before_cents -
            resolution.remaining_exposure_cents,
        ),
      0,
    );
  const countOverdueAt = (at: number) =>
    source.actions.filter(
      (action) =>
        !terminalActionStatuses.has(action.status) &&
        action.due_at !== null &&
        Date.parse(action.due_at) < at,
    ).length;
  const awaitingUserAt = (at: number) =>
    source.actions.filter(
      (action) =>
        !terminalActionStatuses.has(action.status) &&
        action.owner_user_id === source.currentUserId &&
        Date.parse(action.created_at) < at,
    ).length;
  const hasRiskHistory = source.risks.some(
    (risk) => Date.parse(risk.detected_at) < today,
  );
  const hasResolutionHistory = source.resolutions.some(
    (resolution) => Date.parse(resolution.resolved_at) < today,
  );
  const hasActionHistory = source.actions.some(
    (action) => Date.parse(action.created_at) < today,
  );

  const escalatedRiskIds = new Set(
    source.activities
      .filter(
        (activity) =>
          inWindow(activity.occurred_at, now - 2 * DAY_MS, now + 1) &&
          (activity.activity_type === "severity_changed" ||
            (activity.activity_type === "status_changed" &&
              activity.to_status === "action_needed")),
      )
      .map((activity) => activity.risk_id),
  );
  const riskPriorities: PriorityItem[] = openRisks.map((risk) => {
    const project = risk.project_id
      ? projectById.get(risk.project_id)
      : undefined;
    const reasons = [
      risk.severity === "critical" || risk.severity === "high"
        ? `${risk.severity} severity`
        : "",
      risk.due_at && Date.parse(risk.due_at) < now ? "past due" : "",
      !risk.assigned_user_id ? "no owner assigned" : "",
      escalatedRiskIds.has(risk.id) ? "recently escalated" : "",
      risk.potential_exposure_cents >= 10_000_000
        ? "material estimated exposure"
        : "",
    ].filter(Boolean);
    return {
      id: `risk:${risk.id}`,
      kind: "risk",
      title: risk.title,
      projectId: risk.project_id,
      projectName: project?.name ?? "No project",
      reason: formatReason(reasons.length ? reasons : ["active margin risk"]),
      exposureCents: risk.potential_exposure_cents,
      ownerName: risk.assigned_user_id
        ? (userById.get(risk.assigned_user_id) ?? "Unknown owner")
        : "Unassigned",
      dueAt: risk.due_at,
      status: risk.status,
      nextAction:
        risk.status === "monitoring" ? "Review risk" : "Open response",
      href: `/risks/${risk.id}`,
      score: scoreRiskPriority(risk, source.now, escalatedRiskIds.has(risk.id)),
    };
  });
  const actionPriorities: PriorityItem[] = openActions
    .filter((action) => action.due_at && Date.parse(action.due_at) < now)
    .map((action) => {
      const risk = riskById.get(action.risk_id);
      const project = risk?.project_id
        ? projectById.get(risk.project_id)
        : undefined;
      return {
        id: `action:${action.id}`,
        kind: "action",
        title: action.title,
        projectId: risk?.project_id ?? null,
        projectName: project?.name ?? "No project",
        reason: action.owner_user_id
          ? "action is overdue"
          : "overdue and unassigned",
        exposureCents: risk?.potential_exposure_cents ?? null,
        ownerName: action.owner_user_id
          ? (userById.get(action.owner_user_id) ?? "Unknown owner")
          : "Unassigned",
        dueAt: action.due_at,
        status: action.status,
        nextAction: "Update action",
        href: `/actions?search=${encodeURIComponent(action.title)}`,
        score: scoreActionPriority(action, source.now),
      };
    });
  const priorities = [...riskPriorities, ...actionPriorities]
    .toSorted(
      (a, b) =>
        b.score - a.score ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 6);

  const portfolio: PortfolioHealthRow[] = source.projects
    .filter((project) => project.status === "active")
    .map((project): PortfolioHealthRow => {
      const projectRisks = openRisks.filter(
        (risk) => risk.project_id === project.id,
      );
      const current = projectRisks.filter((risk) =>
        inWindow(risk.detected_at, now - 7 * DAY_MS, now + 1),
      ).length;
      const previous = projectRisks.filter((risk) =>
        inWindow(risk.detected_at, now - 14 * DAY_MS, now - 7 * DAY_MS),
      ).length;
      const topRisk = projectRisks.toSorted(
        (a, b) =>
          scoreRiskPriority(b, source.now, escalatedRiskIds.has(b.id)) -
          scoreRiskPriority(a, source.now, escalatedRiskIds.has(a.id)),
      )[0];
      const exposureCents = projectRisks.reduce(
        (sum, risk) => sum + risk.potential_exposure_cents,
        0,
      );
      return {
        id: project.id,
        name: project.name,
        location:
          [project.city, project.state_code].filter(Boolean).join(", ") ||
          "Location unavailable",
        contractValueCents: project.contract_value_cents,
        projectedMarginCents: project.projected_margin_cents ?? null,
        openRiskCount: projectRisks.length,
        exposureCents,
        trend:
          current === 0 && previous === 0
            ? "insufficient"
            : current > previous
              ? "up"
              : current < previous
                ? "down"
                : "steady",
        topIssue: topRisk?.title ?? null,
        concernScore:
          exposureCents / 1_000_000 +
          projectRisks.length * 10 +
          (project.projected_margin_cents < 0 ? 30 : 0),
      };
    })
    .toSorted(
      (a, b) => b.concernScore - a.concernScore || a.name.localeCompare(b.name),
    );

  const monthStart = new Date(
    source.now.getFullYear(),
    source.now.getMonth(),
    1,
  ).getTime();
  const monthResolutions = source.resolutions.filter(
    (resolution) =>
      !resolution.reopened_at &&
      Date.parse(resolution.resolved_at) >= monthStart,
  );
  const resolutionRiskById = new Map(
    source.risks.map((risk) => [risk.id, risk]),
  );
  const valueRows = monthResolutions.flatMap((resolution) => {
    const risk = resolutionRiskById.get(resolution.risk_id);
    return risk
      ? [
          {
            exposureBeforeCents: resolution.exposure_before_cents,
            remainingExposureCents: resolution.remaining_exposure_cents,
            estimatedLossAvoidedCents: resolution.estimated_loss_avoided_cents,
            detectedAt: risk.detected_at,
            resolvedAt: resolution.resolved_at,
          },
        ]
      : [];
  });
  const value = calculateResolutionValueSummary(valueRows);
  const monthActions = source.actions.filter(
    (action) => Date.parse(action.created_at) >= monthStart,
  );
  const completedMonthActions = monthActions.filter(
    (action) => action.status === "completed",
  ).length;
  const hasLossAvoidedData = monthResolutions.some(
    (resolution) => resolution.estimated_loss_avoided_cents > 0,
  );

  const dueToday = openActions
    .filter((action) => inWindow(action.due_at, today, tomorrow))
    .flatMap((action) => actionViewById.get(action.id) ?? []);
  const overdue = openActions
    .filter((action) => action.due_at && Date.parse(action.due_at) < today)
    .flatMap((action) => actionViewById.get(action.id) ?? []);
  const overdueIds = new Set(overdue.map((action) => `action:${action.id}`));
  const overdueExposureCents = sumMoneyCents(
    priorities.flatMap((priority) =>
      priority.kind === "action" &&
      overdueIds.has(priority.id) &&
      priority.exposureCents !== null
        ? [priority.exposureCents]
        : [],
    ),
  );
  const waitingExternal = openActions
    .filter((action) =>
      ["contact_vendor", "request_document", "open_rfi"].includes(
        action.action_type,
      ),
    )
    .flatMap((action) => actionViewById.get(action.id) ?? []);
  const recentlyCompleted = source.actions
    .filter(
      (action) =>
        action.status === "completed" &&
        action.completed_at &&
        Date.parse(action.completed_at) >= now - 7 * DAY_MS,
    )
    .toSorted(
      (a, b) =>
        Date.parse(b.completed_at ?? "") - Date.parse(a.completed_at ?? ""),
    )
    .flatMap((action) => actionViewById.get(action.id) ?? [])
    .slice(0, 5);

  return {
    generatedAt: source.now.toISOString(),
    timezone,
    currentUserName: source.currentUser.full_name,
    canViewFinancials: true,
    riskAnalytics: null,
    riskAnalyticsByProject: {},
    isEmptyOrganization:
      source.projects.length === 0 && source.risks.length === 0,
    hasActiveRisks: openRisks.length > 0,
    overnight: {
      newRisks: {
        value: source.risks.filter((risk) =>
          inWindow(risk.detected_at, today, tomorrow),
        ).length,
        previousValue: hasRiskHistory
          ? source.risks.filter((risk) =>
              inWindow(risk.detected_at, yesterday, today),
            ).length
          : null,
      },
      resolvedRisks: {
        value: todayResolutions.length,
        previousValue: hasResolutionHistory
          ? yesterdayResolutions.length
          : null,
      },
      overdueActions: {
        value: countOverdueAt(now),
        previousValue: hasActionHistory ? countOverdueAt(today) : null,
      },
      awaitingUser: {
        value: awaitingUserAt(now + 1),
        previousValue: hasActionHistory ? awaitingUserAt(today) : null,
      },
      exposureDeltaCents: {
        value: exposureChange(today, tomorrow, todayResolutions),
        previousValue:
          hasRiskHistory || hasResolutionHistory
            ? exposureChange(yesterday, today, yesterdayResolutions)
            : null,
      },
    },
    priorities,
    portfolio,
    portfolioSummary: {
      activeProjects: activeProjects.length,
      projectsAtRisk,
      totalExposureCents: openRisks.reduce(
        (sum, risk) => sum + risk.potential_exposure_cents,
        0,
      ),
      forecastMarginPercent: null,
    },
    financialAnalytics: null,
    riskDrivers,
    riskHeatmap,
    work: {
      dueToday,
      overdue,
      overdueExposureCents,
      unownedRisks: openRisks
        .filter((risk) => !risk.assigned_user_id)
        .map((risk) => ({
          id: risk.id,
          title: risk.title,
          projectName: risk.project_id
            ? (projectById.get(risk.project_id)?.name ?? "No project")
            : "No project",
        }))
        .slice(0, 5),
      waitingExternal: waitingExternal.slice(0, 5),
      recentlyCompleted,
    },
    activity: [],
    value: {
      risksResolved: value.risksResolved,
      estimatedExposureReducedCents: value.estimatedExposureReducedCents,
      estimatedLossAvoidedCents: hasLossAvoidedData
        ? value.estimatedLossAvoidedCents
        : null,
      averageResolutionHours: valueRows.length
        ? value.averageResolutionHours
        : null,
      actionCompletionRate: monthActions.length
        ? Math.round((completedMonthActions / monthActions.length) * 100)
        : null,
    },
    owners: source.users.map((user) => ({ id: user.id, name: user.full_name })),
    observations: [],
    intelligence: {
      portfolioWatch: [],
      emergingPatterns: [],
      historicalComparisons: [],
      rootCauseSuggestions: [],
      executiveRecommendations: [],
    },
  };
}
