import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrganizationRole } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Json } from "@/lib/supabase/database.types";

export type TeamMembershipRecord = Readonly<{
  id: string;
  organizationId: string;
  authUserId: string;
  applicationUserId: string;
  role: OrganizationRole;
}>;

export class TeamRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<TeamMembershipRecord | null> {
    const { data, error } = await this.client
      .from("organization_memberships")
      .select("id,organization_id,auth_user_id,application_user_id,role")
      .eq("organization_id", organizationId)
      .eq("id", membershipId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data
      ? {
          id: data.id,
          organizationId: data.organization_id,
          authUserId: data.auth_user_id,
          applicationUserId: data.application_user_id,
          role: data.role,
        }
      : null;
  }

  async changeRole(
    organizationId: string,
    membershipId: string,
    role: OrganizationRole,
  ): Promise<void> {
    const { error } = await this.client
      .from("organization_memberships")
      .update({ role })
      .eq("organization_id", organizationId)
      .eq("id", membershipId);
    if (error) throw new Error(error.message);
  }

  async transferOwnership(
    organizationId: string,
    actorMembershipId: string,
    targetMembershipId: string,
  ): Promise<void> {
    const { error } = await this.client.rpc(
      "transfer_organization_ownership",
      {
        target_organization_id: organizationId,
        actor_membership_id: actorMembershipId,
        target_membership_id: targetMembershipId,
      },
    );
    if (error) throw new Error(error.message);
  }

  async removeMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("organization_memberships")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", membershipId);
    if (error) throw new Error(error.message);
  }

  async revokeInvitation(
    organizationId: string,
    invitationId: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("id", invitationId)
      .is("accepted_at", null)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
  }

  async resendInvitation(
    organizationId: string,
    invitationId: string,
    expiresAt: string,
    tokenHash: string,
  ): Promise<{
    email: string;
    role: "administrator" | "manager" | "contributor";
  }> {
    const { data, error } = await this.client
      .from("invitations")
      .select("email,role,send_count")
      .eq("organization_id", organizationId)
      .eq("id", invitationId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Invitation not found.");
    const { error: updateError } = await this.client
      .from("invitations")
      .update({
        expires_at: expiresAt,
        last_sent_at: new Date().toISOString(),
        send_count: data.send_count + 1,
        token_hash: tokenHash,
      })
      .eq("organization_id", organizationId)
      .eq("id", invitationId);
    if (updateError) throw new Error(updateError.message);
    return { email: data.email, role: data.role };
  }

  async appendEvent(input: {
    organizationId: string;
    actorMembershipId: string;
    targetMembershipId?: string | null;
    eventType:
      | "member_invited"
      | "invitation_revoked"
      | "invitation_resent"
      | "member_removed"
      | "member_role_changed"
      | "ownership_transferred"
      | "project_members_changed";
    summary: string;
    metadata?: Json;
  }): Promise<void> {
    const { error } = await this.client.from("team_activity_events").insert({
      organization_id: input.organizationId,
      actor_membership_id: input.actorMembershipId,
      target_membership_id: input.targetMembershipId ?? null,
      event_type: input.eventType,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
    if (error) throw new Error(error.message);
  }

  async createNotification(input: {
    organizationId: string;
    recipientMembershipId: string | null;
    eventType: string;
    payload: Json;
  }): Promise<void> {
    const { error } = await this.client
      .from("notifications")
      .insert({
        organization_id: input.organizationId,
        recipient_membership_id: input.recipientMembershipId,
        notification_type: normalizeNotificationType(input.eventType),
        title: notificationTitle(input.eventType),
        body: "",
        payload: input.payload,
      });
    if (error) throw new Error(error.message);
  }

  async replaceProjectAssignments(input: {
    organizationId: string;
    actorMembershipId: string;
    targetMembershipId: string;
    projectIds: readonly string[];
  }): Promise<void> {
    const { data: projects, error: projectError } = input.projectIds.length
      ? await this.client
          .from("projects")
          .select("id")
          .eq("organization_id", input.organizationId)
          .in("id", [...input.projectIds])
      : { data: [], error: null };
    if (projectError) throw new Error(projectError.message);
    if ((projects ?? []).length !== new Set(input.projectIds).size)
      throw new Error("Project not found.");
    const { error: deleteError } = await this.client
      .from("project_memberships")
      .delete()
      .eq("organization_id", input.organizationId)
      .eq("organization_membership_id", input.targetMembershipId);
    if (deleteError) throw new Error(deleteError.message);
    if (!input.projectIds.length) return;
    const { error: insertError } = await this.client
      .from("project_memberships")
      .insert(
        input.projectIds.map((projectId) => ({
          organization_id: input.organizationId,
          project_id: projectId,
          organization_membership_id: input.targetMembershipId,
          created_by_membership_id: input.actorMembershipId,
        })),
      );
    if (insertError) throw new Error(insertError.message);
  }
}

function normalizeNotificationType(
  eventType: string,
):
  | "mention"
  | "assignment"
  | "role_change"
  | "invitation"
  | "project_added"
  | "risk_assigned"
  | "action_completed" {
  if (eventType.includes("role")) return "role_change";
  if (eventType.includes("invitation")) return "invitation";
  if (eventType.includes("project")) return "project_added";
  return "assignment";
}

function notificationTitle(eventType: string) {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
