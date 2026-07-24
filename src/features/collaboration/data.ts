import "server-only";

import { CollaborationRepository } from "@/features/collaboration/repository";
import { requireActorContext } from "@/lib/auth/request-context";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getRiskCollaboration(riskId: string, projectId: string) {
  const viewedNowCutoff = Date.now() - 5 * 60_000;
  const [context, membership] = await Promise.all([
    requireActorContext(),
    requireCurrentMembership(),
  ]);
  const client = createAdminSupabaseClient();
  const repository = new CollaborationRepository(client);
  await client.from("resource_presence").upsert(
    {
      organization_id: context.organizationId,
      project_id: projectId,
      membership_id: membership.id,
      resource_type: "risk",
      resource_id: riskId,
      last_viewed_at: new Date().toISOString(),
    },
    {
      onConflict: "organization_id,membership_id,resource_type,resource_id",
    },
  );
  const [comments, collaborators, presenceResult, historyResult] =
    await Promise.all([
      repository.listRiskComments(context, membership.id, riskId),
      repository.listCollaborators(context.organizationId),
      client
        .from("resource_presence")
        .select("*")
        .eq("organization_id", context.organizationId)
        .eq("resource_type", "risk")
        .eq("resource_id", riskId)
        .order("last_viewed_at", { ascending: false })
        .limit(8),
      client
        .from("assignment_history")
        .select("*")
        .eq("organization_id", context.organizationId)
        .eq("subject_type", "risk")
        .eq("subject_id", riskId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
  if (presenceResult.error || historyResult.error)
    throw new Error((presenceResult.error ?? historyResult.error)!.message);
  const collaboratorByMembership = new Map(
    collaborators.map((person) => [person.membershipId, person]),
  );
  const collaboratorByUser = new Map(
    collaborators.map((person) => [person.userId, person]),
  );
  return {
    comments,
    collaborators,
    viewers: presenceResult.data.flatMap((presence) => {
      const person = collaboratorByMembership.get(presence.membership_id);
      return person
        ? [{
            ...person,
            lastViewedAt: presence.last_viewed_at,
            viewingNow: Date.parse(presence.last_viewed_at) >= viewedNowCutoff,
          }]
        : [];
    }),
    assignmentHistory: historyResult.data.map((history) => ({
      id: history.id,
      previousAssignee:
        history.previous_assignee_user_id
          ? collaboratorByUser.get(history.previous_assignee_user_id)?.name ?? "Unknown"
          : "Unassigned",
      assignee:
        history.assignee_user_id
          ? collaboratorByUser.get(history.assignee_user_id)?.name ?? "Unknown"
          : "Unassigned",
      assignedAt: history.created_at,
      assignedBy:
        collaboratorByMembership.get(history.assigned_by_membership_id)?.name ??
        "Unknown",
    })),
  };
}
