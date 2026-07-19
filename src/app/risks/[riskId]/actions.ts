"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { RiskManagementService } from "@/features/risks/service";
import { runServerMutation } from "@/lib/server-mutation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resolve"), riskId: z.uuid() }),
  z.object({
    kind: z.literal("assign"),
    riskId: z.uuid(),
    userId: z.uuid().nullable(),
  }),
  z.object({
    kind: z.literal("due"),
    riskId: z.uuid(),
    dueDate: z.iso.date().nullable(),
  }),
]);

const commentSchema = z.object({
  riskId: z.uuid(),
  comment: z.string().trim().min(2).max(3_000),
  mentionedUserId: z.uuid().nullable(),
});

export async function addRiskCommentAction(
  input: z.input<typeof commentSchema>,
) {
  const value = await runServerMutation(
    commentSchema,
    input,
    async (context, parsed) => {
      const service = new RiskManagementService(createAdminSupabaseClient());
      await service.addComment(
        context,
        parsed.riskId,
        parsed.comment,
        parsed.mentionedUserId ? [parsed.mentionedUserId] : [],
      );
      return parsed;
    },
  );
  revalidatePath(`/risks/${value.riskId}`);
  revalidatePath("/activity");
}

export async function updateRiskDetailAction(
  input: z.input<typeof mutationSchema>,
) {
  await runServerMutation(mutationSchema, input, async (context, value) => {
    const service = new RiskManagementService(createAdminSupabaseClient());
    if (value.kind === "resolve") {
      await service.resolve(context, value.riskId);
    } else if (value.kind === "assign") {
      await service.assignOwner(context, value.riskId, value.userId);
    } else {
      await service.setDueDate(
        context,
        value.riskId,
        value.dueDate ? `${value.dueDate}T17:00:00.000Z` : null,
      );
    }
  });
  const value = mutationSchema.parse(input);
  revalidatePath(`/risks/${value.riskId}`);
  revalidatePath("/risks");
  revalidatePath("/projects");
}
