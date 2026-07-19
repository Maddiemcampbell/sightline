"use server";

import { revalidatePath } from "next/cache";

import { RecommendedActionService } from "@/features/actions/service";
import {
  actionMutationSchema,
  type ActionMutationInput,
} from "@/features/actions/validation";
import { runServerMutation } from "@/lib/server-mutation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function mutateRecommendedAction(input: ActionMutationInput) {
  return runServerMutation(
    actionMutationSchema,
    input,
    async (context, value) => {
      const service = new RecommendedActionService(createAdminSupabaseClient());
      const action =
        value.operation === "accept"
          ? await service.accept(context, value.actionId)
          : value.operation === "start"
            ? await service.start(context, value.actionId)
            : value.operation === "complete"
              ? await service.complete(context, value.actionId)
              : value.operation === "assign"
                ? await service.assignOwner(
                    context,
                    value.actionId,
                    value.ownerUserId,
                  )
                : value.operation === "priority"
                  ? await service.changePriority(
                      context,
                      value.actionId,
                      value.priority,
                    )
                  : value.operation === "due_date"
                    ? await service.setDueDate(
                        context,
                        value.actionId,
                        value.dueAt,
                      )
                    : await service.dismiss(
                        context,
                        value.actionId,
                        value.reason,
                      );
      revalidatePath("/actions");
      revalidatePath("/brief");
      revalidatePath(`/risks/${action.risk_id}`);
      return action;
    },
  );
}
