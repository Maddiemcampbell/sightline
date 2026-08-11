"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditEvent } from "@/features/audit/service";
import { getForecastingView } from "@/features/forecasting/data";
import { MeetingService } from "@/features/meetings/service";
import {
  createMeetingSchema,
  meetingDecisionSchema,
  meetingFollowUpSchema,
  meetingIdSchema,
} from "@/features/meetings/validation";
import { assertAuthorized, can } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type MeetingActionState = Readonly<{
  message?: string;
  error?: string;
}>;

export async function createMeetingAction(formData: FormData) {
  const context = await requireActorContext();
  assertAuthorized(can(context, "action:edit"));
  const input = createMeetingSchema.parse({
    title: formData.get("title"),
    meetingType: formData.get("meetingType"),
    startsAt: formData.get("startsAt"),
    projectIds: formData.getAll("projectId"),
  });
  const meeting = await new MeetingService(createAdminSupabaseClient()).create(
    context,
    { ...input, forecast: await getForecastingView() },
  );
  await audit(context, "meeting.created", meeting.id, {
    meetingType: meeting.meeting_type,
    projectCount: meeting.project_ids.length,
  });
  redirect(`/meetings/${meeting.id}`);
}

export async function recordMeetingDecisionAction(
  _state: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  try {
    const context = await requireActorContext();
    assertAuthorized(can(context, "action:edit"));
    const input = meetingDecisionSchema.parse({
      meetingId: formData.get("meetingId"),
      riskId: nullable(formData.get("riskId")),
      projectId: nullable(formData.get("projectId")),
      summary: formData.get("summary"),
      rationale: nullable(formData.get("rationale")),
    });
    const decision = await new MeetingService(
      createAdminSupabaseClient(),
    ).recordDecision(context, input);
    await audit(context, "meeting.decision_recorded", input.meetingId, {
      decisionId: decision.id,
    });
    revalidatePath(`/meetings/${input.meetingId}`);
    return { message: "Decision recorded." };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function createMeetingFollowUpAction(
  _state: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  try {
    const context = await requireActorContext();
    assertAuthorized(can(context, "action:edit"));
    const input = meetingFollowUpSchema.parse({
      meetingId: formData.get("meetingId"),
      riskId: formData.get("riskId"),
      title: formData.get("title"),
      description: formData.get("description"),
      ownerUserId: nullable(formData.get("ownerUserId")),
      priority: formData.get("priority"),
      dueAt: nullable(formData.get("dueAt")),
    });
    const action = await new MeetingService(
      createAdminSupabaseClient(),
    ).createFollowUp(context, input);
    await audit(context, "meeting.follow_up_created", input.meetingId, {
      actionId: action.id,
    });
    revalidatePath(`/meetings/${input.meetingId}`);
    revalidatePath("/actions");
    return { message: "Follow-up action created." };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function completeMeetingAction(formData: FormData) {
  const meetingId = meetingIdSchema.parse(formData.get("meetingId"));
  const context = await requireActorContext();
  assertAuthorized(can(context, "action:edit"));
  await new MeetingService(createAdminSupabaseClient()).complete(
    context,
    meetingId,
  );
  await audit(context, "meeting.completed", meetingId);
  revalidatePath(`/meetings/${meetingId}`);
}

function nullable(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value : null;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function audit(
  context: Awaited<ReturnType<typeof requireActorContext>>,
  action:
    | "meeting.created"
    | "meeting.decision_recorded"
    | "meeting.follow_up_created"
    | "meeting.completed",
  meetingId: string,
  metadata?: Record<string, unknown>,
) {
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action,
    resourceType: "meeting",
    resourceId: meetingId,
    ...(metadata ? { metadata: metadata as Json } : {}),
  });
}
