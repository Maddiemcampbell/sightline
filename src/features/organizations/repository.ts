import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Invitation,
  OrganizationMemberProfile,
  Organization,
  OrganizationMembership,
} from "@/features/organizations/types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

function toOrganization(row: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_by_auth_user_id: string | null;
}): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    createdByAuthUserId: row.created_by_auth_user_id,
  };
}

export class OrganizationRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async listMemberships(
    authUserId: string,
  ): Promise<OrganizationMembership[]> {
    const { data: memberships, error } = await this.client
      .from("organization_memberships")
      .select("*")
      .eq("auth_user_id", authUserId)
      .order("created_at");
    if (error) throw new Error(error.message);
    if (!memberships.length) return [];

    const { data: organizations, error: organizationsError } = await this.client
      .from("organizations")
      .select("*")
      .in(
        "id",
        memberships.map((membership) => membership.organization_id),
      );
    if (organizationsError) throw new Error(organizationsError.message);
    const organizationById = new Map(
      organizations.map((organization) => [
        organization.id,
        toOrganization(organization),
      ]),
    );

    return memberships.flatMap((membership) => {
      const organization = organizationById.get(membership.organization_id);
      return organization
        ? [
            {
              id: membership.id,
              organizationId: membership.organization_id,
              authUserId: membership.auth_user_id,
              applicationUserId: membership.application_user_id,
              role: membership.role,
              organization,
            },
          ]
        : [];
    });
  }

  async findMembership(
    authUserId: string,
    organizationId: string,
  ): Promise<OrganizationMembership | null> {
    const memberships = await this.listMemberships(authUserId);
    return (
      memberships.find(
        (membership) => membership.organizationId === organizationId,
      ) ?? null
    );
  }

  async listMemberProfiles(
    organizationId: string,
  ): Promise<OrganizationMemberProfile[]> {
    const { data: memberships, error } = await this.client
      .from("organization_memberships")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at");
    if (error) throw new Error(error.message);
    if (!memberships.length) return [];

    const { data: users, error: usersError } = await this.client
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .in(
        "id",
        memberships.map((membership) => membership.application_user_id),
      );
    if (usersError) throw new Error(usersError.message);
    const userById = new Map(users.map((user) => [user.id, user]));
    return memberships.flatMap((membership) => {
      const user = userById.get(membership.application_user_id);
      return user
        ? [
            {
              membershipId: membership.id,
              email: user.email,
              fullName: user.full_name,
              role: membership.role,
            },
          ]
        : [];
    });
  }

  async createOrganization(input: {
    authUserId: string;
    email: string;
    fullName: string;
    name: string;
    slug: string;
  }): Promise<string> {
    const { data, error } = await this.client.rpc(
      "create_organization_for_user",
      {
        organization_name: input.name,
        organization_slug: input.slug,
        principal_auth_user_id: input.authUserId,
        principal_email: input.email,
        principal_full_name: input.fullName,
      },
    );
    if (error) throw new Error(error.message);
    return data;
  }

  async updateOrganization(
    organizationId: string,
    input: { name: string; slug: string },
  ): Promise<void> {
    const { error } = await this.client
      .from("organizations")
      .update({ name: input.name, slug: input.slug })
      .eq("id", organizationId);
    if (error) throw new Error(error.message);
  }

  async createInvitation(input: {
    organizationId: string;
    email: string;
    tokenHash: string;
    invitedByMembershipId: string;
    expiresAt: string;
  }): Promise<void> {
    const { error } = await this.client.from("invitations").insert({
      organization_id: input.organizationId,
      email: input.email,
      token_hash: input.tokenHash,
      invited_by_membership_id: input.invitedByMembershipId,
      expires_at: input.expiresAt,
    });
    if (error) throw new Error(error.message);
  }

  async listInvitations(organizationId: string): Promise<Invitation[]> {
    const { data, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data.map((invitation) => ({
      id: invitation.id,
      organizationId: invitation.organization_id,
      email: invitation.email,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      revokedAt: invitation.revoked_at,
    }));
  }

  async findInvitationByHash(tokenHash: string): Promise<{
    invitation: Invitation;
    organization: Organization;
  } | null> {
    const { data: invitation, error } = await this.client
      .from("invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invitation) return null;

    const { data: organization, error: organizationError } = await this.client
      .from("organizations")
      .select("*")
      .eq("id", invitation.organization_id)
      .single();
    if (organizationError) throw new Error(organizationError.message);

    return {
      invitation: {
        id: invitation.id,
        organizationId: invitation.organization_id,
        email: invitation.email,
        expiresAt: invitation.expires_at,
        acceptedAt: invitation.accepted_at,
        revokedAt: invitation.revoked_at,
      },
      organization: toOrganization(organization),
    };
  }

  async acceptInvitation(input: {
    tokenHash: string;
    authUserId: string;
    email: string;
    fullName: string;
  }): Promise<string> {
    const { data, error } = await this.client.rpc(
      "accept_organization_invitation",
      {
        invitation_token_hash: input.tokenHash,
        principal_auth_user_id: input.authUserId,
        principal_email: input.email,
        principal_full_name: input.fullName,
      },
    );
    if (error) throw new Error(error.message);
    return data;
  }

  async leaveOrganization(
    membershipId: string,
    authUserId: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("leave_organization", {
      target_membership_id: membershipId,
      principal_auth_user_id: authUserId,
    });
    if (error) throw new Error(error.message);
  }
}
