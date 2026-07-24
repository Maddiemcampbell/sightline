import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProjectRole } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export type ProjectMemberView = Readonly<{
  assignmentId: string;
  membershipId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  organizationRole: string;
  projectRole: ProjectRole;
  lastActiveAt: string | null;
}>;

export type ProjectInvitationView = Readonly<{
  id: string;
  email: string;
  role: ProjectRole;
  expiresAt: string;
  revokedAt: string | null;
}>;

export class ProjectAccessRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async listProjectMembers(
    organizationId: string,
    projectId: string,
  ): Promise<ProjectMemberView[]> {
    const { data: assignments, error } = await this.client
      .from("project_memberships")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId);
    if (error) throw new Error(error.message);
    if (!assignments.length) return [];
    const { data: memberships, error: membershipError } = await this.client
      .from("organization_memberships")
      .select("*")
      .eq("organization_id", organizationId)
      .in(
        "id",
        assignments.map((assignment) => assignment.organization_membership_id),
      );
    if (membershipError) throw new Error(membershipError.message);
    const { data: users, error: userError } = await this.client
      .from("users")
      .select("id,full_name,email")
      .eq("organization_id", organizationId)
      .in(
        "id",
        memberships.map((membership) => membership.application_user_id),
      );
    if (userError) throw new Error(userError.message);
    const membershipById = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );
    const userById = new Map(users.map((user) => [user.id, user]));
    return assignments.flatMap((assignment) => {
      const membership = membershipById.get(
        assignment.organization_membership_id,
      );
      const user = membership
        ? userById.get(membership.application_user_id)
        : null;
      return membership && user
        ? [
            {
              assignmentId: assignment.id,
              membershipId: membership.id,
              fullName: user.full_name,
              email: user.email,
              avatarUrl: membership.avatar_url,
              organizationRole: membership.role,
              projectRole: assignment.role,
              lastActiveAt:
                assignment.last_active_at ?? membership.last_active_at,
            },
          ]
        : [];
    });
  }

  async listEligibleMembers(organizationId: string) {
    const { data: memberships, error } = await this.client
      .from("organization_memberships")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    const { data: users, error: userError } = await this.client
      .from("users")
      .select("id,full_name,email")
      .eq("organization_id", organizationId);
    if (userError) throw new Error(userError.message);
    const userById = new Map(users.map((user) => [user.id, user]));
    return memberships.flatMap((membership) => {
      const user = userById.get(membership.application_user_id);
      return user
        ? [
            {
              membershipId: membership.id,
              fullName: user.full_name,
              email: user.email,
              organizationRole: membership.role,
            },
          ]
        : [];
    });
  }

  async assignMany(input: {
    organizationId: string;
    projectId: string;
    actorMembershipId: string;
    membershipIds: readonly string[];
    role: ProjectRole;
  }): Promise<void> {
    const { data: memberships, error } = await this.client
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", input.organizationId)
      .in("id", [...input.membershipIds]);
    if (error) throw new Error(error.message);
    if (memberships.length !== new Set(input.membershipIds).size)
      throw new Error("Organization member not found.");
    const { error: upsertError } = await this.client
      .from("project_memberships")
      .upsert(
        input.membershipIds.map((membershipId) => ({
          organization_id: input.organizationId,
          project_id: input.projectId,
          organization_membership_id: membershipId,
          created_by_membership_id: input.actorMembershipId,
          role: input.role,
        })),
        { onConflict: "project_id,organization_membership_id" },
      );
    if (upsertError) throw new Error(upsertError.message);
  }

  async removeMany(input: {
    organizationId: string;
    projectId: string;
    membershipIds: readonly string[];
  }): Promise<void> {
    const { error } = await this.client
      .from("project_memberships")
      .delete()
      .eq("organization_id", input.organizationId)
      .eq("project_id", input.projectId)
      .in("organization_membership_id", [...input.membershipIds]);
    if (error) throw new Error(error.message);
  }

  async createInvitation(input: {
    organizationId: string;
    projectId: string;
    actorMembershipId: string;
    email: string;
    role: ProjectRole;
    tokenHash: string;
    expiresAt: string;
  }): Promise<string> {
    const { data, error } = await this.client
      .from("project_invitations")
      .insert({
        organization_id: input.organizationId,
        project_id: input.projectId,
        email: input.email,
        role: input.role,
        token_hash: input.tokenHash,
        invited_by_membership_id: input.actorMembershipId,
        expires_at: input.expiresAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  async listInvitations(
    organizationId: string,
    projectId: string,
  ): Promise<ProjectInvitationView[]> {
    const { data, error } = await this.client
      .from("project_invitations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("project_id", projectId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expires_at,
      revokedAt: invitation.revoked_at,
    }));
  }

  async acceptInvitation(input: {
    tokenHash: string;
    authUserId: string;
    email: string;
  }): Promise<string> {
    const { data: invitation, error } = await this.client
      .from("project_invitations")
      .select("*")
      .eq("token_hash", input.tokenHash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (
      !invitation ||
      invitation.accepted_at ||
      invitation.revoked_at ||
      Date.parse(invitation.expires_at) <= Date.now() ||
      invitation.email !== input.email.toLowerCase()
    )
      throw new Error("Project invitation is invalid or expired.");
    const { data: membership, error: membershipError } = await this.client
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", invitation.organization_id)
      .eq("auth_user_id", input.authUserId)
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership)
      throw new Error("Join the organization before accepting project access.");
    await this.assignMany({
      organizationId: invitation.organization_id,
      projectId: invitation.project_id,
      actorMembershipId: invitation.invited_by_membership_id,
      membershipIds: [membership.id],
      role: invitation.role,
    });
    const { error: updateError } = await this.client
      .from("project_invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by_membership_id: membership.id,
      })
      .eq("id", invitation.id)
      .eq("organization_id", invitation.organization_id);
    if (updateError) throw new Error(updateError.message);
    return invitation.project_id;
  }
}
