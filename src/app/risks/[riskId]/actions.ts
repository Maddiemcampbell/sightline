"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { reopenRiskSchema, resolveRiskSchema } from "@/domain/resolutions";
import { ResolutionTrackingService } from "@/features/resolutions/service";
import { RiskManagementService } from "@/features/risks/service";
import { runServerMutation } from "@/lib/server-mutation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canResolveRisk,
  canViewRisk,
  canComment,
} from "@/lib/auth/authorization";

const mutationSchema = z.discriminatedUnion("kind", [
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
      assertAuthorized(canComment(context));
      const service = new RiskManagementService(
        await createServerSupabaseClient(),
      );
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
    assertAuthorized(canViewRisk(context));
    const service = new RiskManagementService(
      await createServerSupabaseClient(),
    );
    if (value.kind === "assign") {
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

export async function resolveRiskAction(input: unknown) {
  const parsed = resolveRiskSchema.parse(input);
  const resolution = await runServerMutation(
    resolveRiskSchema,
    parsed,
    async (context, value) => {
      assertAuthorized(canResolveRisk(context));
      return new ResolutionTrackingService(
        await createServerSupabaseClient(),
      ).resolve(context, value);
    },
  );
  revalidateRiskViews(parsed.riskId);
  return resolution;
}

export async function reopenRiskAction(input: unknown) {
  const parsed = reopenRiskSchema.parse(input);
  const risk = await runServerMutation(
    reopenRiskSchema,
    parsed,
    async (context, value) => {
      assertAuthorized(canResolveRisk(context));
      return new ResolutionTrackingService(
        await createServerSupabaseClient(),
      ).reopen(context, value);
    },
  );
  revalidateRiskViews(parsed.riskId);
  return risk;
}

function revalidateRiskViews(riskId: string) {
  revalidatePath("/brief");
  revalidatePath("/risks");
  revalidatePath(`/risks/${riskId}`);
}
