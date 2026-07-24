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
} from "@/lib/auth/authorization";

export async function mutateAction(input: ActionMutationInput) {
  return runServerMutation(
    actionMutationSchema,
    input,
    async (context, value) => {
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
        assertAuthorized(canAssignAction(context));
      }
      return value.operation === "accept"
        ? service.accept(context, value.actionId)
        : value.operation === "start"
          ? service.start(context, value.actionId)
          : value.operation === "complete"
            ? service.complete(context, value.actionId)
            : value.operation === "assign"
              ? service.assignOwner(context, value.actionId, value.ownerUserId)
              : value.operation === "priority"
                ? service.changePriority(
                    context,
                    value.actionId,
                    value.priority,
                  )
                : value.operation === "due_date"
                  ? service.setDueDate(context, value.actionId, value.dueAt)
                  : service.dismiss(context, value.actionId, value.reason);
    },
  );
}
