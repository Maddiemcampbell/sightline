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
  canComment,
  canResolveProjectRisks,
} from "@/lib/auth/authorization";
import { requireRiskProjectAccess } from "@/lib/auth/project-access";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { CollaborationService } from "@/features/collaboration/service";
import {
  commentIdSchema,
  commentInputSchema,
  editCommentSchema,
  reactionSchema,
} from "@/features/collaboration/validation";
import { recordAssignment } from "@/features/collaboration/assignments";

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

export async function addRiskCommentAction(
  input: z.input<typeof commentInputSchema>,
) {
  const membership = await requireCurrentMembership();
  const value = await runServerMutation(
    commentInputSchema,
    input,
    async (context, parsed) => {
      const access = await requireRiskProjectAccess(context, parsed.riskId);
      assertAuthorized(
        canComment(context) && access.resource.projectRole !== "viewer",
      );
      const result = await new CollaborationService(
        createAdminSupabaseClient(),
      ).createRiskComment({
        context,
        actorMembershipId: membership.id,
        riskId: parsed.riskId,
        projectId: access.projectId,
        bodyMarkdown: parsed.bodyMarkdown,
      });
      await new RiskManagementService(
        await createServerSupabaseClient(),
      ).addComment(
        context,
        parsed.riskId,
        parsed.bodyMarkdown,
        result.mentionedUserIds,
      );
      return parsed;
    },
  );
  revalidatePath(`/risks/${value.riskId}`);
  revalidatePath("/activity");
}

export async function editRiskCommentAction(input: unknown) {
  const parsedInput = editCommentSchema.parse(input);
  const membership = await requireCurrentMembership();
  const value = await runServerMutation(
    editCommentSchema,
    parsedInput,
    async (context, parsed) => {
      await requireRiskProjectAccess(context, parsed.riskId);
      await new CollaborationService(createAdminSupabaseClient()).editComment({
        context,
        actorMembershipId: membership.id,
        commentId: parsed.commentId,
        bodyMarkdown: parsed.bodyMarkdown,
      });
      return parsed;
    },
  );
  revalidatePath(`/risks/${value.riskId}`);
}

export async function deleteRiskCommentAction(input: unknown) {
  const parsedInput = commentIdSchema.parse(input);
  const membership = await requireCurrentMembership();
  const value = await runServerMutation(
    commentIdSchema,
    parsedInput,
    async (context, parsed) => {
      await requireRiskProjectAccess(context, parsed.riskId);
      await new CollaborationService(createAdminSupabaseClient()).deleteComment(
        context,
        membership.id,
        parsed.commentId,
      );
      return parsed;
    },
  );
  revalidatePath(`/risks/${value.riskId}`);
}

export async function toggleRiskCommentReactionAction(input: unknown) {
  const parsedInput = reactionSchema.parse(input);
  const membership = await requireCurrentMembership();
  const value = await runServerMutation(
    reactionSchema,
    parsedInput,
    async (context, parsed) => {
      await requireRiskProjectAccess(context, parsed.riskId);
      await new CollaborationService(
        createAdminSupabaseClient(),
      ).toggleReaction({
        context,
        membershipId: membership.id,
        commentId: parsed.commentId,
        reaction: parsed.reaction,
      });
      return parsed;
    },
  );
  revalidatePath(`/risks/${value.riskId}`);
}

export async function updateRiskDetailAction(
  input: z.input<typeof mutationSchema>,
) {
  await runServerMutation(mutationSchema, input, async (context, value) => {
    const access = await requireRiskProjectAccess(context, value.riskId);
    assertAuthorized(canResolveProjectRisks(context, access.resource));
    const service = new RiskManagementService(
      await createServerSupabaseClient(),
    );
    if (value.kind === "assign") {
      const admin = createAdminSupabaseClient();
      const { data: before } = await admin
        .from("risks")
        .select("assigned_user_id")
        .eq("organization_id", context.organizationId)
        .eq("id", value.riskId)
        .single();
      await service.assignOwner(context, value.riskId, value.userId);
      await recordAssignment({
        client: admin,
        context,
        actorMembershipId: (await requireCurrentMembership()).id,
        projectId: access.projectId,
        subjectType: "risk",
        subjectId: value.riskId,
        previousAssigneeUserId: before?.assigned_user_id ?? null,
        assigneeUserId: value.userId,
        href: `/risks/${value.riskId}`,
        title: "Risk assigned to you",
      });
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
      const access = await requireRiskProjectAccess(context, value.riskId);
      assertAuthorized(
        canResolveRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
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
      const access = await requireRiskProjectAccess(context, value.riskId);
      assertAuthorized(
        canResolveRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
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
