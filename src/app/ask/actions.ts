"use server";

import { revalidatePath } from "next/cache";

import { askOrganizationQuestionSchema } from "@/domain/ai/organization-question";
import { RecommendedActionService } from "@/features/actions/service";
import { recordAuditEvent } from "@/features/audit/service";
import { getForecastingView } from "@/features/forecasting/data";
import { EmailDraftService } from "@/features/email-drafts/service";
import { MeetingService } from "@/features/meetings/service";
import { AskSightlineService } from "@/features/ask-sightline/service";
import {
  applyAskActionProposalSchema,
  applyAskEmailProposalSchema,
  applyAskMeetingProposalSchema,
  type ApplyAskActionProposalInput,
  type ApplyAskActionProposalResult,
} from "@/features/ask-sightline/workflow-validation";
import {
  assertAuthorized,
  canAssignAction,
  canAssignProjectActions,
  can,
  canEditAction,
  canEditRisk,
  canResolveProjectRisks,
  canUseAi,
} from "@/lib/auth/authorization";
import {
  requireProjectAccess,
  requireRiskProjectAccess,
} from "@/lib/auth/project-access";
import { runServerMutation } from "@/lib/server-mutation";
import {
  createAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

export async function askOrganizationSightlineAction(input: unknown) {
  const parsed = askOrganizationQuestionSchema.parse(input);
  return runServerMutation(
    askOrganizationQuestionSchema,
    parsed,
    async (context, value) => {
      assertAuthorized(canUseAi(context));
      if (value.projectId !== "all")
        await requireProjectAccess(context, value.projectId);
      return new AskSightlineService(
        await createServerSupabaseClient(),
      ).askOrganization(context, {
        question: value.question,
        advisorMode: value.advisorMode,
        projectId: value.projectId === "all" ? null : value.projectId,
        history: value.history,
      });
    },
  );
}

export async function applyAskActionProposalAction(
  input: ApplyAskActionProposalInput,
): Promise<readonly ApplyAskActionProposalResult[]> {
  const parsed = applyAskActionProposalSchema.parse(input);
  const results = await runServerMutation(
    applyAskActionProposalSchema,
    parsed,
    async (context, value) => {
      const client = await createServerSupabaseClient();
      const service = new RecommendedActionService(client);
      const created: ApplyAskActionProposalResult[] = [];
      for (const item of value.items) {
        try {
          const access = await requireRiskProjectAccess(context, item.riskId);
          assertAuthorized(canEditAction(context, access.resource));
          if (item.ownerUserId)
            assertAuthorized(
              canAssignAction(context, access.resource) &&
                canAssignProjectActions(context, access.resource),
            );
          const detectionKey = `chat-proposal:${value.proposalId}:${item.id}`;
          const { data: existing, error: existingError } = await client
            .from("recommended_actions")
            .select("id")
            .eq("organization_id", context.organizationId)
            .eq("risk_id", item.riskId)
            .eq("detection_key", detectionKey)
            .maybeSingle();
          if (existingError) throw new Error(existingError.message);
          if (existing) {
            created.push({
              itemId: item.id,
              status: "created",
              actionId: existing.id,
              alreadyCreated: true,
              error: null,
            });
            continue;
          }
          let actionId: string;
          try {
            const action = await service.create(context, {
              riskId: item.riskId,
              ownerUserId: item.ownerUserId,
              detectionKey,
              title: item.title,
              description: item.description,
              actionType: "other",
              status: "accepted",
              priority: item.priority,
              dueAt: item.dueDate ? `${item.dueDate}T17:00:00.000Z` : null,
              completedAt: null,
              dismissedAt: null,
              dismissalReason: null,
              createdBy: context.userId,
              source: "ai_suggestion",
            });
            actionId = action.id;
          } catch (error) {
            const { data: raced } = await client
              .from("recommended_actions")
              .select("id")
              .eq("organization_id", context.organizationId)
              .eq("risk_id", item.riskId)
              .eq("detection_key", detectionKey)
              .maybeSingle();
            if (!raced) throw error;
            created.push({
              itemId: item.id,
              status: "created",
              actionId: raced.id,
              alreadyCreated: true,
              error: null,
            });
            continue;
          }
          created.push({
            itemId: item.id,
            status: "created",
            actionId,
            alreadyCreated: false,
            error: null,
          });
        } catch (error) {
          created.push({
            itemId: item.id,
            status: "failed",
            actionId: null,
            alreadyCreated: false,
            error: workflowItemError(error),
          });
        }
      }
      return created;
    },
  );
  revalidatePath("/actions");
  revalidatePath("/brief");
  for (const item of parsed.items) revalidatePath(`/risks/${item.riskId}`);
  return results;
}

export async function applyAskMeetingProposalAction(input: unknown) {
  const parsed = applyAskMeetingProposalSchema.parse(input);
  const meeting = await runServerMutation(
    applyAskMeetingProposalSchema,
    parsed,
    async (context, value) => {
      assertAuthorized(can(context, "action:edit"));
      const meeting = await new MeetingService(
        createAdminSupabaseClient(),
      ).create(context, {
        ...value,
        projectIds: [...value.projectIds],
        forecast: await getForecastingView(),
      });
      await recordAuditEvent({
        organizationId: context.organizationId,
        actorAuthUserId: context.authUserId,
        actorUserId: context.userId,
        action: "meeting.created",
        resourceType: "meeting",
        resourceId: meeting.id,
        metadata: {
          meetingType: meeting.meeting_type,
          projectCount: meeting.project_ids.length,
          source: "ask_sightline",
        },
      });
      return meeting;
    },
  );
  revalidatePath("/meetings");
  return { id: meeting.id, href: `/meetings/${meeting.id}` };
}

export async function applyAskEmailProposalAction(input: unknown) {
  const parsed = applyAskEmailProposalSchema.parse(input);
  const draft = await runServerMutation(
    applyAskEmailProposalSchema,
    parsed,
    async (context, value) => {
      const access = await requireRiskProjectAccess(context, value.riskId);
      assertAuthorized(
        canEditRisk(context) &&
          canResolveProjectRisks(context, access.resource),
      );
      const service = new EmailDraftService(await createServerSupabaseClient());
      const generated = await service.generate(context, {
        riskId: value.riskId,
        actionId: null,
        recipientRole: value.recipientRole,
        contactKey: null,
        desiredTone: value.desiredTone,
        requestedUrgency: value.requestedUrgency,
        purpose: value.purpose,
        length: value.length,
      });
      return service.save(context, generated.id, {
        subject: value.subject,
        body: value.body,
        contactKey: null,
      });
    },
  );
  revalidatePath(`/risks/${parsed.riskId}`);
  return {
    id: draft.id,
    href: `/risks/${parsed.riskId}/email-draft?draftId=${draft.id}`,
  };
}

function workflowItemError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/not authorized|unauthorized/i.test(message))
    return "Your current permissions do not allow this action to be created.";
  if (/owner not found/i.test(message))
    return "The selected owner is no longer available.";
  return "The action could not be created. Review its details and try again.";
}
