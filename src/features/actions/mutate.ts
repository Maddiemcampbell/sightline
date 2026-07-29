import "server-only";

import { RecommendedActionService } from "@/features/actions/service";
import {
  actionMutationSchema,
  type ActionMutationInput,
} from "@/features/actions/validation";
import { runServerMutation } from "@/lib/server-mutation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canAssignAction,
  canEditAction,
  canCompleteAction,
  canAssignProjectActions,
} from "@/lib/auth/authorization";
import { requireActionProjectAccess } from "@/lib/auth/project-access";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  notifyActionCompleted,
  recordAssignment,
} from "@/features/collaboration/assignments";

export async function mutateAction(input: ActionMutationInput) {
  return runServerMutation(
    actionMutationSchema,
    input,
    async (context, value) => {
      const access = await requireActionProjectAccess(context, value.actionId);
      const service = new RecommendedActionService(
        await createServerSupabaseClient(),
      );
      assertAuthorized(
        value.operation === "complete"
          ? canCompleteAction(context)
          : canEditAction(context),
      );
      if (
        value.operation === "complete" &&
        context.organizationRole === "contributor"
      ) {
        const client = await createServerSupabaseClient();
        const { data, error } = await client
          .from("recommended_actions")
          .select("owner_user_id")
          .eq("organization_id", context.organizationId)
          .eq("id", value.actionId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        assertAuthorized(data?.owner_user_id === context.userId);
      }
      if (value.operation === "assign") {
        assertAuthorized(
          canAssignAction(context) &&
            canAssignProjectActions(context, access.resource),
        );
      }
      const needsCollaborationContext =
        value.operation === "assign" || value.operation === "complete";
      const admin = needsCollaborationContext
        ? createAdminSupabaseClient()
        : null;
      const before = admin
        ? (
            await admin
              .from("recommended_actions")
              .select("owner_user_id,risk_id")
              .eq("organization_id", context.organizationId)
              .eq("id", value.actionId)
              .single()
          ).data
        : null;
      const result =
        value.operation === "accept"
          ? service.accept(context, value.actionId)
          : value.operation === "start"
            ? service.start(context, value.actionId)
            : value.operation === "complete"
              ? service.complete(context, value.actionId)
              : value.operation === "assign"
                ? service.assignOwner(
                    context,
                    value.actionId,
                    value.ownerUserId,
                  )
                : value.operation === "priority"
                  ? service.changePriority(
                      context,
                      value.actionId,
                      value.priority,
                    )
                  : value.operation === "due_date"
                    ? service.setDueDate(context, value.actionId, value.dueAt)
                    : service.dismiss(context, value.actionId, value.reason);
      const changed = await result;
      if (value.operation === "assign" && admin) {
        const actorMembershipId = (await requireCurrentMembership()).id;
        await recordAssignment({
          client: admin,
          context,
          actorMembershipId,
          projectId: access.projectId,
          subjectType: "action",
          subjectId: value.actionId,
          previousAssigneeUserId: before?.owner_user_id ?? null,
          assigneeUserId: value.ownerUserId,
          href: `/risks/${before?.risk_id ?? changed.risk_id}?tab=actions`,
          title: "Action assigned to you",
        });
      }
      if (value.operation === "complete" && admin) {
        const actorMembershipId = (await requireCurrentMembership()).id;
        await notifyActionCompleted({
          client: admin,
          context,
          actorMembershipId,
          ownerUserId: before?.owner_user_id ?? null,
          actionId: value.actionId,
          riskId: before?.risk_id ?? changed.risk_id,
        });
      }
      return changed;
    },
  );
}
