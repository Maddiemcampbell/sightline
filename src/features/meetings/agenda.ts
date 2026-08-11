import type { ForecastingView } from "@/features/forecasting/types";
import type { AgendaItem, MeetingType } from "@/features/meetings/types";

export function buildMeetingAgenda(input: {
  meetingType: MeetingType;
  projectIds: readonly string[];
  forecast: ForecastingView;
}): AgendaItem[] {
  const selected = new Set(input.projectIds);
  const selectedProjects = input.forecast.projects.filter(
    (project) => !selected.size || selected.has(project.id),
  );
  const projectNames = new Set(selectedProjects.map((project) => project.name));
  const commitments = input.forecast.commitments.filter(
    (item) =>
      !selected.size ||
      (item.projectName && projectNames.has(item.projectName)),
  );
  const items: AgendaItem[] = [
    {
      id: "opening",
      section: "opening",
      title: "Confirm the meeting outcome",
      detail: openingPrompt(input.meetingType, selectedProjects.length),
      sourceHref: "/brief",
      sourceLabel: "Daily Brief",
    },
  ];
  for (const project of selectedProjects.slice(0, 4)) {
    items.push({
      id: `project-${project.id}`,
      section: "attention",
      title: project.name,
      detail: projectSummary(project, input.forecast.canViewFinancials),
      sourceHref: `/projects/${project.id}`,
      sourceLabel: "Project record",
    });
  }
  const relevantRisks = input.forecast.worseningRisks.filter(
    (risk) =>
      !selected.size || (risk.projectId && selected.has(risk.projectId)),
  );
  for (const risk of relevantRisks.slice(0, 4)) {
    items.push({
      id: `risk-${risk.id}`,
      section: "decisions",
      title: risk.title,
      detail: `${humanize(risk.severity)} ${humanize(risk.category)} risk · attention score ${risk.attentionScore}. Confirm the response, owner, and escalation path.`,
      sourceHref: risk.href,
      sourceLabel: "Risk record",
    });
  }
  for (const commitment of commitments.slice(0, 5)) {
    items.push({
      id: `commitment-${commitment.id}`,
      section: "commitments",
      title: commitment.title,
      detail: `${commitment.projectName ?? "Portfolio"} · ${commitment.ownerName ?? "Unassigned"} · due ${formatDate(commitment.dueAt)}.`,
      sourceHref: commitment.href,
      sourceLabel: "Action register",
    });
  }
  items.push({
    id: "closeout",
    section: "closeout",
    title: "Confirm decisions and follow-up ownership",
    detail:
      "Read back every recorded decision, accountable owner, and due date before ending the meeting.",
    sourceHref: null,
    sourceLabel: null,
  });
  return items;
}

function openingPrompt(type: MeetingType, projectCount: number) {
  const scope = projectCount
    ? `${projectCount} selected projects`
    : "the accessible portfolio";
  const purpose: Record<MeetingType, string> = {
    weekly_executive_review:
      "Resolve the highest-priority changes and unblock this week’s commitments",
    monthly_portfolio_review:
      "Review portfolio trajectory and agree on interventions for the next month",
    project_owner_meeting:
      "Resolve ownership gaps and confirm project recovery commitments",
    lender_board_update:
      "Align on portfolio position, forecast confidence, and material exposures",
    risk_committee_briefing:
      "Review material risks and document treatment decisions",
  };
  return `${purpose[type]} across ${scope}.`;
}

function projectSummary(
  project: ForecastingView["projects"][number],
  canViewFinancials: boolean,
) {
  const signals = [`${project.scheduleRiskCount} schedule risks`];
  if (canViewFinancials) {
    signals.unshift(
      project.budgetVariancePercent === null
        ? "budget variance unavailable"
        : `${project.budgetVariancePercent.toFixed(1)}% budget variance`,
      project.forecastMarginPercent === null
        ? "forecast margin unavailable"
        : `${project.forecastMarginPercent.toFixed(1)}% forecast margin`,
    );
  }
  return `${signals.join(" · ")}. Confirm whether leadership intervention is required.`;
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
