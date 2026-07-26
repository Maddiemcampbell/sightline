import "server-only";

import type { DailyBriefView } from "@/features/daily-brief/types";
import { toActionView } from "@/features/actions/data";
import { requireActorContext } from "@/lib/auth/request-context";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function requireRows<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Expected database rows");
  return data;
}

function isJsonObject(
  value: Json,
): value is { readonly [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getDailyBriefView(): Promise<DailyBriefView | null> {
  const { organizationId } = await requireActorContext();
  return getDailyBriefViewForOrganization(organizationId);
}

export async function getDailyBriefViewForOrganization(
  organizationId: string,
): Promise<DailyBriefView | null> {
  const client = createAdminSupabaseClient();
  const { data: brief, error: briefError } = await client
    .from("daily_briefs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("brief_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (briefError) throw new Error(briefError.message);
  if (!brief) return null;

  const [
    itemsResult,
    risksResult,
    projectsResult,
    evidenceResult,
    actionsResult,
    activitiesResult,
    sourcesResult,
    usersResult,
  ] = await Promise.all([
    client
      .from("brief_items")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("daily_brief_id", brief.id)
      .order("priority"),
    client.from("risks").select("*").eq("organization_id", organizationId),
    client
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name"),
    client
      .from("risk_evidence")
      .select("*")
      .eq("organization_id", organizationId)
      .order("occurred_at", { ascending: false }),
    client
      .from("recommended_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at"),
    client
      .from("risk_activities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("occurred_at", { ascending: false }),
    client
      .from("integration_sources")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    client
      .from("users")
      .select("id,full_name")
      .eq("organization_id", organizationId)
      .order("full_name"),
  ]);

  const items = requireRows(itemsResult.data, itemsResult.error);
  const allRisks = requireRows(risksResult.data, risksResult.error);
  const projects = requireRows(projectsResult.data, projectsResult.error);
  const evidence = requireRows(evidenceResult.data, evidenceResult.error);
  const actions = requireRows(actionsResult.data, actionsResult.error);
  const activities = requireRows(activitiesResult.data, activitiesResult.error);
  const sources = requireRows(sourcesResult.data, sourcesResult.error);
  const users = requireRows(usersResult.data, usersResult.error);
  const userById = new Map(users.map((user) => [user.id, user.full_name]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const riskById = new Map(allRisks.map((risk) => [risk.id, risk]));
  const openRisks = allRisks.filter(
    (risk) => risk.status !== "resolved" && risk.status !== "dismissed",
  );

  const risks = items.flatMap((item) => {
    const risk = riskById.get(item.risk_id);
    if (
      !risk ||
      risk.status === "dismissed" ||
      risk.status === "resolved" ||
      !risk.project_id
    )
      return [];
    const project = projectById.get(risk.project_id);
    if (!project) return [];
    const riskEvidence = evidence.find((entry) => entry.risk_id === risk.id);
    const action = actions.find(
      (entry) =>
        entry.risk_id === risk.id &&
        entry.status !== "dismissed" &&
        entry.status !== "completed",
    );
    const acknowledged = activities.some(
      (entry) =>
        entry.risk_id === risk.id &&
        entry.activity_type === "risk_acknowledged" &&
        isJsonObject(entry.metadata) &&
        entry.metadata.acknowledged === true,
    );
    return [
      {
        id: risk.id,
        priority: item.priority as 1 | 2 | 3,
        title: risk.title,
        severity: risk.severity,
        projectId: project.id,
        projectName: project.name,
        projectSubtitle: [
          project.city,
          project.state_code,
          project.project_number,
        ]
          .filter(Boolean)
          .join(" · "),
        exposureCents: risk.potential_exposure_cents,
        marginImpactCents: risk.estimated_margin_impact_cents,
        whyItMatters: risk.why_it_matters,
        evidenceTitle: riskEvidence?.title ?? "No supporting evidence attached",
        evidenceDetail:
          riskEvidence?.excerpt ??
          riskEvidence?.why_it_matters ??
          "Evidence is still being reviewed.",
        confidenceScore: risk.confidence_score,
        recommendedAction: action?.description ?? item.recommended_next_step,
        primaryAction: action
          ? toActionView(
              action,
              action.owner_user_id
                ? (userById.get(action.owner_user_id) ?? null)
                : null,
            )
          : null,
        acknowledged,
      },
    ];
  });

  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  const highestSeverity = openRisks.reduce(
    (highest, risk) => Math.max(highest, severityOrder[risk.severity]),
    0,
  );
  const overallRiskLevel =
    highestSeverity === 3
      ? "Critical"
      : highestSeverity === 2
        ? "High"
        : highestSeverity === 1
          ? "Moderate"
          : "Low";

  return {
    briefId: brief.id,
    briefDate: brief.brief_date,
    totalProfitAtRiskCents: risks.reduce(
      (sum, risk) => sum + risk.marginImpactCents,
      0,
    ),
    activeProjectCount: projects.filter(
      (project) => project.status === "active",
    ).length,
    openRiskCount: openRisks.length,
    overallRiskLevel,
    risks,
    projects: projects
      .filter((project) => project.status === "active")
      .map((project) => ({
        id: project.id,
        name: project.name,
        location: [project.city, project.state_code].filter(Boolean).join(", "),
        openRiskCount: openRisks.filter(
          (risk) => risk.project_id === project.id,
        ).length,
      })),
    recentResolutions: allRisks
      .filter((risk) => risk.status === "resolved")
      .slice(0, 3)
      .map((risk) => ({
        id: risk.id,
        title: risk.title,
        projectName: risk.project_id
          ? (projectById.get(risk.project_id)?.name ?? "Unassigned")
          : "Unassigned",
      })),
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      lastSyncedAt: source.last_synced_at,
    })),
    actionOwners: users.map((user) => ({ id: user.id, name: user.full_name })),
  };
}
