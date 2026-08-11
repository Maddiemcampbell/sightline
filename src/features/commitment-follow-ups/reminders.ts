import "server-only";

import { shouldRemind } from "@/features/commitment-follow-ups/state";
import { NotificationRepository } from "@/features/notifications/repository";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function createDueCommitmentReminders(
  organizationId: string,
  now = new Date(),
) {
  const client = createAdminSupabaseClient();
  const { data: followUps, error } = await client
    .from("commitment_follow_ups")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "awaiting_response")
    .lt("expected_response_at", now.toISOString());
  if (error) throw new Error(error.message);
  const due = (followUps ?? []).filter((item) => shouldRemind(item, now));
  if (!due.length) return 0;
  const ownerIds = [...new Set(due.map((item) => item.owner_user_id))];
  const { data: memberships, error: membershipError } = await client
    .from("organization_memberships")
    .select("id,application_user_id")
    .eq("organization_id", organizationId)
    .in("application_user_id", ownerIds);
  if (membershipError) throw new Error(membershipError.message);
  const membershipByUser = new Map(
    (memberships ?? []).map((item) => [item.application_user_id, item.id]),
  );
  const notifications = new NotificationRepository(client);
  let created = 0;
  for (const followUp of due) {
    const membershipId = membershipByUser.get(followUp.owner_user_id);
    if (!membershipId) continue;
    await notifications.create({
      organizationId,
      recipientMembershipId: membershipId,
      type: "commitment_follow_up",
      title: "Commitment response is overdue",
      body: followUp.requested_commitment,
      href: `/risks/${followUp.risk_id}/email-draft?draftId=${followUp.email_draft_id}`,
      payload: { followUpId: followUp.id },
    });
    const update = await client
      .from("commitment_follow_ups")
      .update({
        last_reminded_at: now.toISOString(),
        reminder_count: followUp.reminder_count + 1,
      })
      .eq("organization_id", organizationId)
      .eq("id", followUp.id);
    if (update.error) throw new Error(update.error.message);
    created += 1;
  }
  return created;
}
