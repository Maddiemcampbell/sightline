import "server-only";

import { buildDashboardView } from "@/features/dashboard/aggregation";
import { getActivityPage } from "@/features/activity/data";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canViewFinancialExposure,
  canViewProject,
  canViewRisk,
} from "@/lib/auth/authorization";
import { derivePortfolioObservations } from "@/features/portfolio-intelligence/core";

export async function getDashboardView() {
  const context = await requireActorContext();
  assertAuthorized(canViewProject(context));
  assertAuthorized(canViewRisk(context));
  assertAuthorized(canViewFinancialExposure(context));
  const client = await createServerSupabaseClient();
  const [
    organizationResult,
    currentUserResult,
    projectsResult,
    risksResult,
    actionsResult,
    activitiesResult,
    resolutionsResult,
    usersResult,
    documentsResult,
    vendorsResult,
    activityPage,
  ] = await Promise.all([
    client
      .from("organizations")
      .select("timezone")
      .eq("id", context.organizationId)
      .maybeSingle(),
    client
      .from("users")
      .select("id,full_name")
      .eq("organization_id", context.organizationId)
      .eq("id", context.userId)
      .maybeSingle(),
    client
      .from("projects")
      .select("*")
      .eq("organization_id", context.organizationId),
    client
      .from("risks")
      .select("*")
      .eq("organization_id", context.organizationId),
    client
      .from("recommended_actions")
      .select("*")
      .eq("organization_id", context.organizationId),
    client
      .from("risk_activities")
      .select("*")
      .eq("organization_id", context.organizationId)
      .gte("occurred_at", new Date(Date.now() - 14 * 86_400_000).toISOString()),
    client
      .from("risk_resolutions")
      .select("*")
      .eq("organization_id", context.organizationId),
    client
      .from("users")
      .select("id,full_name")
      .eq("organization_id", context.organizationId)
      .order("full_name"),
    client
      .from("documents")
      .select("id,project_id,archived_at")
      .eq("organization_id", context.organizationId),
    client
      .from("vendors")
      .select("id,name")
      .eq("organization_id", context.organizationId),
    getActivityPage({ limit: 20 }),
  ]);
  const results = [
    organizationResult,
    currentUserResult,
    projectsResult,
    risksResult,
    actionsResult,
    activitiesResult,
    resolutionsResult,
    usersResult,
    documentsResult,
    vendorsResult,
  ];
  for (const result of results)
    if (result.error) throw new Error(result.error.message);
  if (!currentUserResult.data)
    throw new Error("Authenticated application user not found.");

  const timezone = organizationResult.data?.timezone ?? "America/Los_Angeles";
  const view = buildDashboardView(
    {
      now: new Date(),
      currentUserId: context.userId,
      currentUser: currentUserResult.data,
      projects: projectsResult.data ?? [],
      risks: risksResult.data ?? [],
      actions: actionsResult.data ?? [],
      activities: activitiesResult.data ?? [],
      resolutions: resolutionsResult.data ?? [],
      users: usersResult.data ?? [],
    },
    timezone,
  );
  const meaningfulActivityTypes = new Set([
    "risk_detected",
    "risk_acknowledged",
    "status_changed",
    "severity_changed",
    "owner_assigned",
    "due_date_changed",
    "action_accepted",
    "action_started",
    "action_completed",
    "action_dismissed",
    "evidence_added",
    "document_uploaded",
    "email_marked_sent",
    "comment_added",
    "risk_resolved",
    "risk_reopened",
    "system_analysis_completed",
  ]);
  return {
    ...view,
    observations: derivePortfolioObservations({
      projects: projectsResult.data ?? [],
      risks: risksResult.data ?? [],
      actions: actionsResult.data ?? [],
      documents: documentsResult.data ?? [],
      vendors: vendorsResult.data ?? [],
      now: new Date(),
    }),
    activity: activityPage.items
      .filter((item) => meaningfulActivityTypes.has(item.activityType))
      .slice(0, 8),
  };
}
