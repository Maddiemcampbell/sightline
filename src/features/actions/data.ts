import "server-only";

import type { ActionFilters } from "@/features/actions/data-types";
import type { ActionOwner, ActionView } from "@/features/actions/types";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RecommendedActionRow } from "@/lib/supabase/database-row.types";

export function toActionView(
  row: RecommendedActionRow,
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

export async function getActionsWorkspace(filters: ActionFilters) {
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const [actionsResult, risksResult, projectsResult, usersResult] =
    await Promise.all([
      client
        .from("recommended_actions")
        .select("*")
        .eq("organization_id", context.organizationId)
        .order("due_at", { ascending: true, nullsFirst: false }),
      client
        .from("risks")
        .select("id,title,project_id")
        .eq("organization_id", context.organizationId),
      client
        .from("projects")
        .select("id,name")
        .eq("organization_id", context.organizationId)
        .order("name"),
      client
        .from("users")
        .select("id,full_name")
        .eq("organization_id", context.organizationId)
        .order("full_name"),
    ]);
  for (const result of [
    actionsResult,
    risksResult,
    projectsResult,
    usersResult,
  ])
    if (result.error) throw new Error(result.error.message);
  const actions = actionsResult.data ?? [];
  const risks = risksResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const users = usersResult.data ?? [];
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const userById = new Map(users.map((user) => [user.id, user.full_name]));
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const rows = actions
    .filter((action) => {
      const risk = riskById.get(action.risk_id);
      const projectId = risk?.project_id;
      const searchable =
        `${action.title} ${action.description} ${risk?.title ?? ""}`.toLowerCase();
      const due = action.due_at ? new Date(action.due_at) : null;
      const open =
        action.status !== "completed" && action.status !== "dismissed";
      return (
        (!filters.search ||
          searchable.includes(filters.search.toLowerCase())) &&
        (filters.status === "all" || action.status === filters.status) &&
        (filters.owner === "all" ||
          (filters.owner === "unassigned"
            ? !action.owner_user_id
            : action.owner_user_id === filters.owner)) &&
        (filters.priority === "all" || action.priority === filters.priority) &&
        (filters.project === "all" || projectId === filters.project) &&
        (filters.due === "all" ||
          (filters.due === "overdue" && due && due < now && open) ||
          (filters.due === "today" && due && due >= now && due <= todayEnd) ||
          (filters.due === "week" && due && due >= now && due <= weekEnd) ||
          (filters.due === "none" && !due))
      );
    })
    .map((action) => ({
      action: toActionView(
        action,
        action.owner_user_id
          ? (userById.get(action.owner_user_id) ?? null)
          : null,
      ),
      risk: riskById.get(action.risk_id),
      project: riskById.get(action.risk_id)?.project_id
        ? projectById.get(riskById.get(action.risk_id)?.project_id ?? "")
        : null,
    }));
  return {
    rows,
    owners: users.map((user): ActionOwner => ({
      id: user.id,
      name: user.full_name,
    })),
    projects,
  };
}
