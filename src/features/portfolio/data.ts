import "server-only";

import { BUILDCO_ORGANIZATION_ID } from "@/features/daily-brief/data";
import type {
  ProjectFilters,
  RiskFilters,
} from "@/features/portfolio/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function rows<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Expected database rows");
  return data;
}

async function portfolioRows() {
  const client = createAdminSupabaseClient();
  const [projectsResult, risksResult] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID),
    client
      .from("risks")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID),
  ]);
  return {
    projects: rows(projectsResult.data, projectsResult.error),
    risks: rows(risksResult.data, risksResult.error),
  };
}

export async function getProjects(filters: ProjectFilters) {
  const { projects, risks } = await portfolioRows();
  const search = filters.q.toLowerCase();
  const views = projects
    .map((project) => {
      const projectRisks = risks.filter(
        (risk) =>
          risk.project_id === project.id &&
          !["resolved", "dismissed"].includes(risk.status),
      );
      return {
        id: project.id,
        name: project.name,
        number: project.project_number,
        location: [project.city, project.state_code].filter(Boolean).join(", "),
        stage: project.status,
        projectedMarginCents: project.projected_margin_cents,
        contractValueCents: project.contract_value_cents,
        openRiskCount: projectRisks.length,
        exposureCents: projectRisks.reduce(
          (sum, risk) => sum + risk.potential_exposure_cents,
          0,
        ),
        recentActivity: projectRisks.reduce(
          (latest, risk) => Math.max(latest, Date.parse(risk.updated_at)),
          Date.parse(project.updated_at),
        ),
      };
    })
    .filter(
      (project) =>
        (!search ||
          `${project.name} ${project.number} ${project.location}`
            .toLowerCase()
            .includes(search)) &&
        (filters.stage === "all" || project.stage === filters.stage),
    );
  return views.toSorted((a, b) =>
    filters.sort === "margin"
      ? a.projectedMarginCents - b.projectedMarginCents
      : filters.sort === "name"
        ? a.name.localeCompare(b.name)
        : filters.sort === "activity"
          ? b.recentActivity - a.recentActivity
          : b.exposureCents - a.exposureCents,
  );
}

export async function getRisks(filters: RiskFilters) {
  const { projects, risks } = await portfolioRows();
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const now = Date.now();
  const search = filters.q.toLowerCase();
  return risks
    .map((risk) => ({
      ...risk,
      project: risk.project_id
        ? (projectById.get(risk.project_id) ?? null)
        : null,
    }))
    .filter((risk) => {
      const due = risk.due_at ? Date.parse(risk.due_at) : null;
      const dueMatch =
        filters.due === "all" ||
        (filters.due === "none" && due === null) ||
        (filters.due === "overdue" &&
          due !== null &&
          due < now &&
          !["resolved", "dismissed"].includes(risk.status)) ||
        (filters.due === "7_days" &&
          due !== null &&
          due >= now &&
          due <= now + 7 * 86400000) ||
        (filters.due === "30_days" &&
          due !== null &&
          due >= now &&
          due <= now + 30 * 86400000);
      return (
        (!search ||
          `${risk.title} ${risk.summary} ${risk.project?.name ?? ""}`
            .toLowerCase()
            .includes(search)) &&
        (filters.category === "all" || risk.category === filters.category) &&
        (filters.severity === "all" || risk.severity === filters.severity) &&
        (filters.status === "all" || risk.status === filters.status) &&
        (filters.project === "all" || risk.project_id === filters.project) &&
        dueMatch
      );
    })
    .toSorted((a, b) => {
      const severity = { low: 0, medium: 1, high: 2, critical: 3 } as const;
      if (filters.sort === "confidence")
        return b.confidence_score - a.confidence_score;
      if (filters.sort === "severity")
        return severity[b.severity] - severity[a.severity];
      if (filters.sort === "due")
        return (
          (a.due_at ? Date.parse(a.due_at) : Number.MAX_SAFE_INTEGER) -
          (b.due_at ? Date.parse(b.due_at) : Number.MAX_SAFE_INTEGER)
        );
      if (filters.sort === "detected")
        return Date.parse(b.detected_at) - Date.parse(a.detected_at);
      return b.potential_exposure_cents - a.potential_exposure_cents;
    });
}

export async function getProjectDetail(projectId: string) {
  const client = createAdminSupabaseClient();
  const [
    projectResult,
    risksResult,
    documentsResult,
    linksResult,
    vendorsResult,
    activityResult,
  ] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("id", projectId)
      .maybeSingle(),
    client
      .from("risks")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("project_id", projectId)
      .order("detected_at", { ascending: false }),
    client
      .from("documents")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("project_id", projectId)
      .order("document_date", { ascending: false }),
    client
      .from("project_vendors")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("project_id", projectId),
    client
      .from("vendors")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID),
    client
      .from("risk_activities")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .order("occurred_at", { ascending: false }),
  ]);
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) return null;
  const risks = rows(risksResult.data, risksResult.error);
  const riskIds = new Set(risks.map((risk) => risk.id));
  const links = rows(linksResult.data, linksResult.error);
  const vendorIds = new Set(links.map((link) => link.vendor_id));
  return {
    project: projectResult.data,
    risks,
    documents: rows(documentsResult.data, documentsResult.error),
    vendors: rows(vendorsResult.data, vendorsResult.error).filter((vendor) =>
      vendorIds.has(vendor.id),
    ),
    activities: rows(activityResult.data, activityResult.error)
      .filter((activity) => riskIds.has(activity.risk_id))
      .slice(0, 12),
  };
}

export async function getRiskDetail(riskId: string) {
  const client = createAdminSupabaseClient();
  const { data: risk, error } = await client
    .from("risks")
    .select("*")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("id", riskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!risk) return null;
  const [
    projectResult,
    vendorResult,
    ownerResult,
    evidenceResult,
    documentsResult,
    actionsResult,
    activitiesResult,
    usersResult,
  ] = await Promise.all([
    risk.project_id
      ? client
          .from("projects")
          .select("*")
          .eq("organization_id", BUILDCO_ORGANIZATION_ID)
          .eq("id", risk.project_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    risk.vendor_id
      ? client
          .from("vendors")
          .select("*")
          .eq("organization_id", BUILDCO_ORGANIZATION_ID)
          .eq("id", risk.vendor_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    risk.assigned_user_id
      ? client
          .from("users")
          .select("*")
          .eq("organization_id", BUILDCO_ORGANIZATION_ID)
          .eq("id", risk.assigned_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("risk_evidence")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("risk_id", riskId)
      .order("observed_at", { ascending: false }),
    client
      .from("documents")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID),
    client
      .from("recommended_actions")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("risk_id", riskId)
      .order("created_at"),
    client
      .from("risk_activities")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .eq("risk_id", riskId)
      .order("occurred_at", { ascending: false }),
    client
      .from("users")
      .select("*")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .order("full_name"),
  ]);
  return {
    risk,
    project: projectResult.data,
    vendor: vendorResult.data,
    owner: ownerResult.data,
    evidence: rows(evidenceResult.data, evidenceResult.error),
    documents: rows(documentsResult.data, documentsResult.error),
    actions: rows(actionsResult.data, actionsResult.error),
    activities: rows(activitiesResult.data, activitiesResult.error),
    users: rows(usersResult.data, usersResult.error),
  };
}
