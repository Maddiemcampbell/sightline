import "server-only";

import { z } from "zod";

import type { LegacyRiskActivityType, RiskActivityType } from "@/domain/types";
import type { TimelineItem } from "@/features/activity/types";
import { orderTimelineItems } from "@/features/activity/ordering";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const cursorSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T[^|]+\|[0-9a-f-]{36}$/)
  .optional();

export async function getActivityPage({
  cursor,
  riskId,
  projectId,
  limit = 20,
}: {
  cursor?: string;
  riskId?: string;
  projectId?: string;
  limit?: number;
}) {
  const scope = z
    .object({
      cursor: cursorSchema,
      riskId: z.uuid().optional(),
      projectId: z.uuid().optional(),
      limit: z.number().int().min(1).max(50),
    })
    .parse({ cursor, riskId, projectId, limit });
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const parsedCursor = scope.cursor;
  let allowedRiskIds: string[] | null = null;
  if (scope.projectId) {
    const { data, error } = await client
      .from("risks")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("project_id", scope.projectId);
    if (error) throw new Error(error.message);
    allowedRiskIds = (data ?? []).map((risk) => risk.id);
    if (!allowedRiskIds.length) return { items: [], nextCursor: null };
  }
  let query = client
    .from("risk_activities")
    .select("*")
    .eq("organization_id", context.organizationId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(scope.limit + 1);
  if (scope.riskId) query = query.eq("risk_id", scope.riskId);
  if (allowedRiskIds) query = query.in("risk_id", allowedRiskIds);
  if (parsedCursor) {
    const [occurredAt, id] = parsedCursor.split("|") as [string, string];
    query = query.or(
      `occurred_at.lt.${occurredAt},and(occurred_at.eq.${occurredAt},id.lt.${id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const pageRows = data ?? [];
  const hasMore = pageRows.length > scope.limit;
  const rows = pageRows.slice(0, scope.limit);
  const riskIds = [...new Set(rows.map((row) => row.risk_id))];
  const actorIds = [
    ...new Set(
      rows.flatMap((row) => (row.actor_user_id ? [row.actor_user_id] : [])),
    ),
  ];
  const mentionedIds = [
    ...new Set(rows.flatMap((row) => row.mentioned_user_ids)),
  ];
  const [risksResult, usersResult] = await Promise.all([
    riskIds.length
      ? client
          .from("risks")
          .select("id,title,project_id")
          .eq("organization_id", context.organizationId)
          .in("id", riskIds)
      : Promise.resolve({ data: [], error: null }),
    actorIds.length || mentionedIds.length
      ? client
          .from("users")
          .select("id,full_name")
          .eq("organization_id", context.organizationId)
          .in("id", [...new Set([...actorIds, ...mentionedIds])])
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (risksResult.error) throw new Error(risksResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);
  const risks = risksResult.data ?? [];
  const projectIds = [
    ...new Set(
      risks.flatMap((risk) => (risk.project_id ? [risk.project_id] : [])),
    ),
  ];
  const projectsResult = projectIds.length
    ? await client
        .from("projects")
        .select("id,name")
        .eq("organization_id", context.organizationId)
        .in("id", projectIds)
    : { data: [], error: null };
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));
  const userById = new Map(
    (usersResult.data ?? []).map((user) => [user.id, user.full_name]),
  );
  const projectById = new Map(
    (projectsResult.data ?? []).map((project) => [project.id, project.name]),
  );
  const items = orderTimelineItems(
    rows.map((row): TimelineItem => {
      const risk = riskById.get(row.risk_id);
      return {
        id: row.id,
        riskId: row.risk_id,
        riskTitle: risk?.title ?? "Risk",
        projectName: risk?.project_id
          ? (projectById.get(risk.project_id) ?? null)
          : null,
        activityType: normalizeActivityType(row.activity_type, row.metadata),
        actorType: row.actor_type,
        actorName: row.actor_user_id
          ? (userById.get(row.actor_user_id) ?? null)
          : null,
        summary: row.summary,
        mentionedNames: row.mentioned_user_ids.flatMap(
          (id) => userById.get(id) ?? [],
        ),
        occurredAt: row.occurred_at,
      };
    }),
  );
  const last = rows.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? `${last.occurred_at}|${last.id}` : null,
  };
}

function normalizeActivityType(
  type: RiskActivityType | LegacyRiskActivityType,
  metadata: unknown,
): RiskActivityType {
  if (type === "created") return "risk_detected";
  if (type === "assigned") return "owner_assigned";
  if (type === "commented") {
    return typeof metadata === "object" &&
      metadata !== null &&
      "acknowledged" in metadata
      ? "risk_acknowledged"
      : "comment_added";
  }
  if (type === "action_updated") return "risk_updated";
  if (type === "resolved") return "risk_resolved";
  if (type === "dismissed") return "status_changed";
  return type;
}
