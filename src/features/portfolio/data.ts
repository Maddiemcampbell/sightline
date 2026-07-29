import "server-only";

import { z } from "zod";

import { requireActorContext } from "@/lib/auth/request-context";
import type {
  ProjectFilters,
  RiskFilters,
} from "@/features/portfolio/validation";
import {
  PORTFOLIO_PAGE_SIZE,
  type PaginatedResult,
} from "@/features/portfolio/pagination";
import { postgresTimestampSchema } from "@/features/portfolio/database-validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canViewFinancialExposure,
  canViewProject,
  canViewRisk,
} from "@/lib/auth/authorization";
import { sumMoneyCents } from "@/features/financial-analytics/calculations";
import { collectAllRows } from "@/lib/supabase/pagination";

function rows<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Expected database rows");
  return data;
}

const projectPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      image_url: z.string().nullable(),
      name: z.string(),
      project_number: z.string(),
      location: z.string(),
      stage: z.enum(["planning", "active", "on_hold", "complete", "cancelled"]),
      projected_margin_cents: z.number(),
      contract_value_cents: z.number().nullable(),
      forecast_margin_percent: z.coerce.number().nullable(),
      open_risk_count: z.number().int(),
      exposure_cents: z.number(),
      elevated_risk_count: z.number().int(),
      health: z.enum(["at_risk", "watch", "on_track"]),
      risk_score: z.number().int(),
      risk_trend: z.enum(["insufficient", "rising", "improving", "steady"]),
      schedule: z.enum([
        "complete",
        "paused",
        "delayed",
        "planned",
        "on_track",
      ]),
      target_completion_date: z.string().nullable(),
      ai_summary: z.string(),
      recent_activity: postgresTimestampSchema,
    }),
  ),
  total: z.number().int().nonnegative(),
  summary: z.object({
    activeCount: z.number().int().nonnegative(),
    atRiskCount: z.number().int().nonnegative(),
    riskAtRiskCount: z.number().int().nonnegative(),
    totalExposureCents: z.number(),
    averageMarginPercent: z.coerce.number().nullable(),
  }),
});

const riskPageSchema = z.object({
  items: z.array(
    z
      .object({
        id: z.uuid(),
        title: z.string(),
        summary: z.string(),
        category: z.enum([
          "insurance",
          "schedule",
          "documentation",
          "contract",
          "safety",
          "financial",
          "vendor",
          "weather",
          "other",
        ]),
        severity: z.enum(["low", "medium", "high", "critical"]),
        status: z.enum([
          "monitoring",
          "action_needed",
          "in_progress",
          "resolved",
          "dismissed",
        ]),
        potential_exposure_cents: z.number(),
        estimated_margin_impact_cents: z.number(),
        confidence_score: z.number(),
        due_at: z.string().nullable(),
        detected_at: z.string(),
        project_id: z.uuid().nullable(),
        project: z
          .object({
            id: z.uuid(),
            name: z.string(),
            project_number: z.string(),
          })
          .nullable(),
      })
      .passthrough(),
  ),
  total: z.number().int().nonnegative(),
});

export async function getProjects(filters: ProjectFilters): Promise<
  PaginatedResult<
    {
      id: string;
      imageUrl: string | null;
      name: string;
      number: string;
      location: string;
      stage: z.infer<typeof projectPageSchema>["items"][number]["stage"];
      projectedMarginCents: number | null;
      contractValueCents: number | null;
      forecastMarginPercent: number | null;
      openRiskCount: number;
      exposureCents: number | null;
      health: "at_risk" | "watch" | "on_track";
      riskScore: number;
      riskTrend: "insufficient" | "rising" | "improving" | "steady";
      schedule: "complete" | "paused" | "delayed" | "planned" | "on_track";
      targetCompletionDate: string | null;
      aiSummary: string;
      recentActivity: number;
    },
    z.infer<typeof projectPageSchema>["summary"]
  >
> {
  const context = await requireActorContext();
  assertAuthorized(canViewProject(context));
  const canSeeFinancials = canViewFinancialExposure(context);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("list_portfolio_projects_page", {
    requested_organization_id: context.organizationId,
    search_query: filters.q,
    stage_filter: filters.stage,
    sort_key: filters.sort,
    page_size: PORTFOLIO_PAGE_SIZE,
    page_offset: (filters.page - 1) * PORTFOLIO_PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  const result = projectPageSchema.parse(data);
  return {
    items: result.items.map((project) => ({
      id: project.id,
      imageUrl: project.image_url,
      name: project.name,
      number: project.project_number,
      location: project.location,
      stage: project.stage,
      projectedMarginCents: canSeeFinancials
        ? project.projected_margin_cents
        : null,
      contractValueCents: canSeeFinancials
        ? project.contract_value_cents
        : null,
      forecastMarginPercent: canSeeFinancials
        ? project.forecast_margin_percent
        : null,
      openRiskCount: project.open_risk_count,
      exposureCents: canSeeFinancials ? project.exposure_cents : null,
      health: canSeeFinancials
        ? project.health
        : project.elevated_risk_count > 0
          ? "at_risk"
          : project.open_risk_count > 0
            ? "watch"
            : "on_track",
      riskScore: project.risk_score,
      riskTrend: project.risk_trend,
      schedule: project.schedule,
      targetCompletionDate: project.target_completion_date,
      aiSummary: project.ai_summary,
      recentActivity: Date.parse(project.recent_activity),
    })),
    total: result.total,
    page: filters.page,
    pageSize: PORTFOLIO_PAGE_SIZE,
    summary: {
      ...result.summary,
      atRiskCount: canSeeFinancials
        ? result.summary.atRiskCount
        : result.summary.riskAtRiskCount,
      totalExposureCents: canSeeFinancials
        ? result.summary.totalExposureCents
        : 0,
      averageMarginPercent: canSeeFinancials
        ? result.summary.averageMarginPercent
        : null,
    },
  };
}

export type ProjectListView = Awaited<
  ReturnType<typeof getProjects>
>["items"][number];

export async function getRisks(filters: RiskFilters) {
  const context = await requireActorContext();
  assertAuthorized(canViewRisk(context));
  const canSeeFinancials = canViewFinancialExposure(context);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("list_portfolio_risks_page", {
    requested_organization_id: context.organizationId,
    view_filter: filters.view,
    search_query: filters.q,
    category_filter: filters.category,
    severity_filter: filters.severity,
    status_filter: filters.status,
    project_filter: filters.project,
    due_filter: filters.due,
    sort_key: filters.sort,
    page_size: PORTFOLIO_PAGE_SIZE,
    page_offset: (filters.page - 1) * PORTFOLIO_PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  const result = riskPageSchema.parse(data);
  return {
    items: result.items.map((risk) => ({
      ...risk,
      potential_exposure_cents: canSeeFinancials
        ? risk.potential_exposure_cents
        : 0,
      estimated_margin_impact_cents: canSeeFinancials
        ? risk.estimated_margin_impact_cents
        : 0,
    })),
    total: result.total,
    page: filters.page,
    pageSize: PORTFOLIO_PAGE_SIZE,
    summary: undefined,
  } satisfies PaginatedResult<(typeof result.items)[number], undefined>;
}

export async function getResolutionValueSummary() {
  const { organizationId } = await requireActorContext();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("get_resolution_value_summary", {
    requested_organization_id: organizationId,
  });
  if (error) throw new Error(error.message);
  return z
    .object({
      risksResolved: z.number().int().nonnegative(),
      estimatedExposureReducedCents: z.number().nonnegative(),
      estimatedLossAvoidedCents: z.number().nonnegative(),
      averageResolutionHours: z.number().int().nonnegative(),
    })
    .parse(data);
}

export async function getProjectDetail(projectId: string) {
  const { organizationId } = await requireActorContext();
  const client = await createServerSupabaseClient();
  const [
    projectResult,
    risks,
    documentsResult,
    linksResult,
    vendorsResult,
    activityResult,
  ] = await Promise.all([
    client
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", projectId)
      .maybeSingle(),
    collectAllRows((from, to) =>
      client
        .from("risks")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("project_id", projectId)
        .order("id")
        .range(from, to),
    ),
    client
      .from("documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .order("document_date", { ascending: false }),
    client
      .from("project_vendors")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId),
    client.from("vendors").select("*").eq("organization_id", organizationId),
    client
      .from("risk_activities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("occurred_at", { ascending: false }),
  ]);
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) return null;
  const profitAtRiskCents = sumMoneyCents(
    risks
      .filter((risk) => !["resolved", "dismissed"].includes(risk.status))
      .map((risk) => risk.estimated_margin_impact_cents),
  );
  const riskIds = new Set(risks.map((risk) => risk.id));
  const links = rows(linksResult.data, linksResult.error);
  const vendorIds = new Set(links.map((link) => link.vendor_id));
  return {
    project: projectResult.data,
    risks,
    profitAtRiskCents,
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
  const { organizationId } = await requireActorContext();
  const client = await createServerSupabaseClient();
  const { data: risk, error } = await client
    .from("risks")
    .select("*")
    .eq("organization_id", organizationId)
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
    resolutionsResult,
    activitiesResult,
    usersResult,
  ] = await Promise.all([
    risk.project_id
      ? client
          .from("projects")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("id", risk.project_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    risk.vendor_id
      ? client
          .from("vendors")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("id", risk.vendor_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    risk.assigned_user_id
      ? client
          .from("users")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("id", risk.assigned_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client
      .from("risk_evidence")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("risk_id", riskId)
      .order("occurred_at", { ascending: false }),
    client.from("documents").select("*").eq("organization_id", organizationId),
    client
      .from("recommended_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("risk_id", riskId)
      .order("created_at"),
    client
      .from("risk_resolutions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("risk_id", riskId)
      .order("resolved_at", { ascending: false }),
    client
      .from("risk_activities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("risk_id", riskId)
      .order("occurred_at", { ascending: false }),
    client
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
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
    resolutions: rows(resolutionsResult.data, resolutionsResult.error),
    activities: rows(activitiesResult.data, activitiesResult.error),
    users: rows(usersResult.data, usersResult.error),
  };
}
