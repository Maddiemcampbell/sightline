import type { DetectedException, ExceptionRuleSettings } from "./types";

type EvaluationInput = Readonly<{
  now: Date;
  settings: ExceptionRuleSettings;
  projects: readonly Readonly<{
    id: string;
    name: string;
    contractValueCents: number | null;
    projectedMarginCents: number;
  }>[];
  financials: readonly Readonly<{
    projectId: string;
    originalBudgetCents: number | null;
    actualCostCents: number | null;
    forecastCostToCompleteCents: number | null;
    dataAsOfDate: string | null;
  }>[];
  approvedChanges: readonly Readonly<{
    projectId: string;
    amountCents: number;
  }>[];
  risks: readonly Readonly<{
    id: string;
    title: string;
    severity: string;
    assignedUserId: string | null;
    status: string;
  }>[];
  actions: readonly Readonly<{
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
  }>[];
  documents: readonly Readonly<{
    id: string;
    name: string;
    expiresOn: string | null;
  }>[];
  connections: readonly Readonly<{
    id: string;
    provider: string;
    companyName: string;
    status: string;
    createdAt: string;
    lastSuccessfulSyncAt: string | null;
  }>[];
}>;

const DAY = 86_400_000;

export function evaluateExceptions(
  input: EvaluationInput,
): DetectedException[] {
  const alerts: DetectedException[] = [];
  const financialByProject = new Map(
    input.financials.map((row) => [row.projectId, row]),
  );
  const approvedByProject = new Map<string, number>();
  for (const change of input.approvedChanges)
    approvedByProject.set(
      change.projectId,
      (approvedByProject.get(change.projectId) ?? 0) + change.amountCents,
    );

  for (const project of input.projects) {
    if (input.settings.marginEnabled && project.contractValueCents) {
      const margin =
        (project.projectedMarginCents / project.contractValueCents) * 100;
      if (margin < input.settings.marginFloorPercent)
        alerts.push({
          ruleType: "margin_below_target",
          fingerprint: `margin:${project.id}`,
          subjectType: "project",
          subjectId: project.id,
          severity: margin < 0 ? "critical" : "warning",
          title: `${project.name} margin is below target`,
          body: `Forecast margin is ${margin.toFixed(1)}%, below the ${input.settings.marginFloorPercent.toFixed(1)}% threshold.`,
          href: `/projects/${project.id}`,
          payload: {
            actualPercent: rounded(margin),
            thresholdPercent: input.settings.marginFloorPercent,
          },
        });
    }

    const financial = financialByProject.get(project.id);
    if (
      input.settings.budgetEnabled &&
      financial &&
      financial.originalBudgetCents !== null
    ) {
      const forecastCost =
        financial.actualCostCents !== null &&
        financial.forecastCostToCompleteCents !== null
          ? financial.actualCostCents + financial.forecastCostToCompleteCents
          : null;
      const revisedBudget =
        financial.originalBudgetCents +
        (approvedByProject.get(project.id) ?? 0);
      if (forecastCost !== null && revisedBudget > 0) {
        const overrun = ((forecastCost - revisedBudget) / revisedBudget) * 100;
        if (overrun > input.settings.budgetVariancePercent)
          alerts.push({
            ruleType: "budget_variance",
            fingerprint: `budget:${project.id}`,
            subjectType: "project",
            subjectId: project.id,
            severity:
              overrun >= input.settings.budgetVariancePercent * 2
                ? "critical"
                : "warning",
            title: `${project.name} forecast is over budget`,
            body: `Forecast cost exceeds revised budget by ${overrun.toFixed(1)}%; the alert threshold is ${input.settings.budgetVariancePercent.toFixed(1)}%.`,
            href: `/forecasts`,
            payload: {
              actualPercent: rounded(overrun),
              thresholdPercent: input.settings.budgetVariancePercent,
            },
          });
      }
    }

    if (input.settings.forecastStaleEnabled) {
      const ageDays = financial?.dataAsOfDate
        ? Math.floor(
            (input.now.getTime() - new Date(financial.dataAsOfDate).getTime()) /
              DAY,
          )
        : null;
      const missing = financial
        ? [
            financial.originalBudgetCents,
            financial.actualCostCents,
            financial.forecastCostToCompleteCents,
          ].filter((value) => value === null).length
        : 3;
      if (
        ageDays === null ||
        ageDays > input.settings.forecastStaleDays ||
        missing > 0
      )
        alerts.push({
          ruleType: "forecast_inputs_stale",
          fingerprint: `forecast-inputs:${project.id}`,
          subjectType: "project",
          subjectId: project.id,
          severity:
            ageDays === null || ageDays > input.settings.forecastStaleDays * 2
              ? "critical"
              : "warning",
          title: `${project.name} forecast confidence is reduced`,
          body: `${ageDays === null ? "Financial inputs have no as-of date" : `Financial inputs are ${ageDays} days old`}${missing ? ` and ${missing} required input${missing === 1 ? " is" : "s are"} missing` : ""}.`,
          href: "/forecasts",
          payload: {
            ageDays,
            missingInputs: missing,
            thresholdDays: input.settings.forecastStaleDays,
          },
        });
    }
  }

  if (input.settings.unownedRiskEnabled)
    for (const risk of input.risks)
      if (
        ["high", "critical"].includes(risk.severity) &&
        !risk.assignedUserId &&
        !["resolved", "dismissed"].includes(risk.status)
      )
        alerts.push({
          ruleType: "unowned_high_risk",
          fingerprint: `unowned-risk:${risk.id}`,
          subjectType: "risk",
          subjectId: risk.id,
          severity: risk.severity === "critical" ? "critical" : "warning",
          title: "High-severity risk needs an owner",
          body: risk.title,
          href: `/risks/${risk.id}`,
        });

  if (input.settings.actionDueEnabled) {
    const horizon = input.now.getTime() + input.settings.actionDueDays * DAY;
    for (const action of input.actions) {
      if (!action.dueAt || ["completed", "dismissed"].includes(action.status))
        continue;
      const due = new Date(action.dueAt).getTime();
      if (due <= horizon) {
        const overdueDays = Math.max(
          0,
          Math.ceil((input.now.getTime() - due) / DAY),
        );
        alerts.push({
          ruleType: "action_due",
          fingerprint: `action-due:${action.id}`,
          subjectType: "recommended_action",
          subjectId: action.id,
          severity: due < input.now.getTime() ? "critical" : "warning",
          title:
            due < input.now.getTime() ? "Action is overdue" : "Action due soon",
          body: `${action.title}${overdueDays ? ` · ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue` : ""}`,
          href: "/actions",
          payload: { dueAt: action.dueAt, overdueDays },
        });
      }
    }
  }

  if (input.settings.documentExpiryEnabled) {
    const horizon =
      input.now.getTime() + input.settings.documentExpiryDays * DAY;
    for (const document of input.documents) {
      if (!document.expiresOn) continue;
      const expiry = new Date(`${document.expiresOn}T23:59:59Z`).getTime();
      if (expiry <= horizon)
        alerts.push({
          ruleType: "document_expiring",
          fingerprint: `document-expiry:${document.id}`,
          subjectType: "document",
          subjectId: document.id,
          severity: expiry < input.now.getTime() ? "critical" : "warning",
          title:
            expiry < input.now.getTime()
              ? "Required document has expired"
              : "Required document expires soon",
          body: `${document.name} · ${document.expiresOn}`,
          href: `/documents/${document.id}`,
          payload: { expiresOn: document.expiresOn },
        });
    }
  }

  if (input.settings.syncStaleEnabled) {
    const cutoff =
      input.now.getTime() - input.settings.syncStaleHours * 3_600_000;
    for (const connection of input.connections) {
      if (connection.status === "disconnected") continue;
      const lastSync = connection.lastSuccessfulSyncAt ?? connection.createdAt;
      if (new Date(lastSync).getTime() < cutoff)
        alerts.push({
          ruleType: "sync_stale",
          fingerprint: `sync-stale:${connection.id}`,
          subjectType: "integration_connection",
          subjectId: connection.id,
          severity: connection.status === "active" ? "warning" : "critical",
          title: `${providerName(connection.provider)} data is stale`,
          body: `${connection.companyName} has not synchronized successfully within ${input.settings.syncStaleHours} hours.`,
          href: "/integrations",
          payload: {
            lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt,
            thresholdHours: input.settings.syncStaleHours,
          },
        });
    }
  }

  return alerts;
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function providerName(provider: string) {
  if (provider === "sharepoint") return "Microsoft 365";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
