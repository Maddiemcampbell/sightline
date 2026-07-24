import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { NotificationRepository } from "@/features/notifications/repository";
import { NotificationService } from "@/features/notifications/service";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export async function recordAssignment(input: {
  client: SupabaseClient<AppDatabase>;
  context: ActorContext;
  actorMembershipId: string;
  projectId: string;
  subjectType: "risk" | "action";
  subjectId: string;
  previousAssigneeUserId: string | null;
  assigneeUserId: string | null;
  href: string;
  title: string;
}) {
  if (input.previousAssigneeUserId === input.assigneeUserId) return;
  const { error } = await input.client.from("assignment_history").insert({
    organization_id: input.context.organizationId,
    project_id: input.projectId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    previous_assignee_user_id: input.previousAssigneeUserId,
    assignee_user_id: input.assigneeUserId,
    assigned_by_membership_id: input.actorMembershipId,
  });
  if (error) throw new Error(error.message);
  if (!input.assigneeUserId) return;
  const { data: recipient, error: recipientError } = await input.client
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", input.context.organizationId)
    .eq("application_user_id", input.assigneeUserId)
    .maybeSingle();
  if (recipientError) throw new Error(recipientError.message);
  if (!recipient) return;
  await new NotificationService(
    new NotificationRepository(input.client),
  ).notify({
    organizationId: input.context.organizationId,
    recipientMembershipId: recipient.id,
    actorMembershipId: input.actorMembershipId,
    type: input.subjectType === "risk" ? "risk_assigned" : "assignment",
    title: input.title,
    href: input.href,
  });
}

export async function notifyActionCompleted(input: {
  client: SupabaseClient<AppDatabase>;
  context: ActorContext;
  actorMembershipId: string;
  ownerUserId: string | null;
  actionId: string;
  riskId: string;
}) {
  if (!input.ownerUserId) return;
  const { data } = await input.client
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", input.context.organizationId)
    .eq("application_user_id", input.ownerUserId)
    .maybeSingle();
  if (!data) return;
  await new NotificationService(
    new NotificationRepository(input.client),
  ).notify({
    organizationId: input.context.organizationId,
    recipientMembershipId: data.id,
    actorMembershipId: input.actorMembershipId,
    type: "action_completed",
    title: "Action completed",
    href: `/risks/${input.riskId}?tab=actions`,
  });
}
