import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  AdminMembership,
  AdminOrganizationMember,
  AdminOrganizationSummary,
  AdminSafeActivity,
  AdminUserSummary,
  OrganizationListInput,
  PageResult,
  UserListInput,
} from "@/features/platform-admin/customer-directory-types";
import { escapeLikePattern } from "@/features/platform-admin/customer-directory-validation";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

type OrganizationDirectoryRow =
  AppDatabase["public"]["Views"]["platform_organization_directory"]["Row"];
type UserDirectoryRow =
  AppDatabase["public"]["Views"]["platform_user_directory"]["Row"];

export class CustomerDirectoryRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async listOrganizations(
    input: OrganizationListInput,
  ): Promise<PageResult<AdminOrganizationSummary>> {
    let query = this.client
      .from("platform_organization_directory")
      .select("*", { count: "exact" });
    if (input.query) {
      if (z.uuid().safeParse(input.query).success)
        query = query.eq("id", input.query);
      else query = query.ilike("name", `%${escapeLikePattern(input.query)}%`);
    }
    if (input.status !== "all")
      query = query.eq("account_status", input.status);
    if (input.members === "yes") query = query.gt("member_count", 0);
    if (input.members === "no") query = query.eq("member_count", 0);
    if (input.issues === "yes")
      query = query.or(
        "failed_job_count.gt.0,failed_delivery_count.gt.0,failed_export_count.gt.0,failed_ai_count.gt.0",
      );
    if (input.issues === "no")
      query = query
        .eq("failed_job_count", 0)
        .eq("failed_delivery_count", 0)
        .eq("failed_export_count", 0)
        .eq("failed_ai_count", 0);
    if (input.recentDays !== "all") {
      query = query.gte(
        "last_activity_at",
        new Date(Date.now() - input.recentDays * 86_400_000).toISOString(),
      );
    }
    if (input.createdDays !== "all")
      query = query.gte(
        "created_at",
        new Date(Date.now() - input.createdDays * 86_400_000).toISOString(),
      );
    const sortColumn = {
      activity: "last_activity_at",
      created: "created_at",
      name: "name",
      members: "member_count",
    }[input.sort];
    query = query
      .order(sortColumn, {
        ascending: input.sort === "name",
        nullsFirst: false,
      })
      .order("id", { ascending: true });
    const from = (input.page - 1) * input.pageSize;
    const { data, error, count } = await query.range(
      from,
      from + input.pageSize - 1,
    );
    if (error) throw new Error(error.message);
    return pageResult(
      (data ?? []).map(toOrganizationSummary),
      count ?? 0,
      input.page,
      input.pageSize,
    );
  }

  async listUsers(input: UserListInput): Promise<PageResult<AdminUserSummary>> {
    let query = this.client
      .from("platform_user_directory")
      .select("*", { count: "exact" });
    if (input.query) {
      if (z.uuid().safeParse(input.query).success)
        query = query.eq("id", input.query);
      else {
        const pattern = `*${escapePostgrestFilter(input.query)}*`;
        query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
      }
    }
    if (input.status !== "all")
      query = query.eq("account_status", input.status);
    if (input.membership === "yes") query = query.gt("membership_count", 0);
    if (input.membership === "no") query = query.eq("membership_count", 0);
    if (input.mfa === "yes") query = query.eq("mfa_enabled", true);
    if (input.mfa === "no") query = query.eq("mfa_enabled", false);
    if (input.loginDays === "never") query = query.is("last_sign_in_at", null);
    if (input.loginDays !== "all" && input.loginDays !== "never")
      query = query.gte(
        "last_sign_in_at",
        new Date(Date.now() - input.loginDays * 86_400_000).toISOString(),
      );
    if (input.createdDays !== "all")
      query = query.gte(
        "created_at",
        new Date(Date.now() - input.createdDays * 86_400_000).toISOString(),
      );
    const sortColumn = {
      login: "last_sign_in_at",
      created: "created_at",
      name: "full_name",
      email: "email",
    }[input.sort];
    query = query
      .order(sortColumn, {
        ascending: input.sort === "name" || input.sort === "email",
        nullsFirst: false,
      })
      .order("id", { ascending: true });
    const from = (input.page - 1) * input.pageSize;
    const { data, error, count } = await query.range(
      from,
      from + input.pageSize - 1,
    );
    if (error) throw new Error(error.message);
    return pageResult(
      (data ?? []).map(toUserSummary),
      count ?? 0,
      input.page,
      input.pageSize,
    );
  }

  async searchOrganizations(query: string, limit = 8) {
    const request = this.client
      .from("platform_organization_directory")
      .select("*")
      .limit(Math.min(Math.max(limit, 1), 20));
    const { data, error } = z.uuid().safeParse(query).success
      ? await request.eq("id", query)
      : await request.ilike("name", `%${escapeLikePattern(query)}%`);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toOrganizationSummary);
  }

  async searchUsers(query: string, limit = 8) {
    const request = this.client
      .from("platform_user_directory")
      .select("*")
      .limit(Math.min(Math.max(limit, 1), 20));
    const { data, error } = z.uuid().safeParse(query).success
      ? await request.eq("id", query)
      : await request.or(
          `full_name.ilike.*${escapePostgrestFilter(query)}*,email.ilike.*${escapePostgrestFilter(query)}*`,
        );
    if (error) throw new Error(error.message);
    return (data ?? []).map(toUserSummary);
  }

  async getOrganization(id: string) {
    const { data, error } = await this.client
      .from("platform_organization_directory")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toOrganizationSummary(data) : null;
  }

  async getUser(id: string) {
    const { data, error } = await this.client
      .from("platform_user_directory")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toUserSummary(data) : null;
  }

  async getOrganizationMembers(
    organizationId: string,
  ): Promise<AdminOrganizationMember[]> {
    const [membershipsResult, invitationsResult] = await Promise.all([
      this.client
        .from("organization_memberships")
        .select("id,auth_user_id,application_user_id,role,created_at")
        .eq("organization_id", organizationId)
        .order("created_at")
        .limit(250),
      this.client
        .from("invitations")
        .select(
          "id,email,role,accepted_at,accepted_by_auth_user_id,revoked_at,expires_at,created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(250),
    ]);
    if (membershipsResult.error)
      throw new Error(membershipsResult.error.message);
    if (invitationsResult.error)
      throw new Error(invitationsResult.error.message);
    const memberships = membershipsResult.data ?? [];
    const [profilesResult, authUsersResult] = await Promise.all([
      memberships.length
        ? this.client
            .from("users")
            .select("id,full_name,email")
            .eq("organization_id", organizationId)
            .in(
              "id",
              memberships.map((membership) => membership.application_user_id),
            )
        : Promise.resolve({ data: [], error: null }),
      memberships.length
        ? this.client
            .from("platform_user_directory")
            .select("id,last_sign_in_at,mfa_enabled")
            .in(
              "id",
              memberships.map((membership) => membership.auth_user_id),
            )
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profilesResult.error) throw new Error(profilesResult.error.message);
    if (authUsersResult.error) throw new Error(authUsersResult.error.message);
    const profileById = new Map(
      (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
    );
    const authById = new Map(
      (authUsersResult.data ?? []).map((user) => [user.id, user]),
    );
    const acceptedAuthUserIds = new Set(
      (invitationsResult.data ?? []).flatMap((invitation) =>
        invitation.accepted_by_auth_user_id
          ? [invitation.accepted_by_auth_user_id]
          : [],
      ),
    );
    const active = memberships.flatMap((membership) => {
      const profile = profileById.get(membership.application_user_id);
      if (!profile) return [];
      const auth = authById.get(membership.auth_user_id);
      return [
        {
          membershipId: membership.id,
          userId: membership.auth_user_id,
          fullName: profile.full_name,
          email: profile.email,
          role: membership.role,
          membershipStatus: "active" as const,
          invitationStatus: acceptedAuthUserIds.has(membership.auth_user_id)
            ? ("accepted" as const)
            : ("none" as const),
          joinedAt: membership.created_at,
          lastLoginAt: auth?.last_sign_in_at ?? null,
          mfaEnabled: auth?.mfa_enabled ?? null,
        },
      ];
    });
    const pending = (invitationsResult.data ?? [])
      .filter(
        (invitation) =>
          !invitation.accepted_at &&
          !invitation.revoked_at &&
          new Date(invitation.expires_at) > new Date(),
      )
      .map((invitation): AdminOrganizationMember => ({
        membershipId: null,
        userId: null,
        fullName: null,
        email: invitation.email,
        role: invitation.role,
        membershipStatus: "invited",
        invitationStatus: "pending",
        joinedAt: null,
        lastLoginAt: null,
        mfaEnabled: null,
      }));
    return [...active, ...pending];
  }

  async getUserMemberships(authUserId: string): Promise<AdminMembership[]> {
    const { data: memberships, error } = await this.client
      .from("organization_memberships")
      .select("id,organization_id,role,created_at,last_active_at")
      .eq("auth_user_id", authUserId)
      .order("created_at", { ascending: false })
      .limit(250);
    if (error) throw new Error(error.message);
    if (!memberships?.length) return [];
    const { data: organizations, error: organizationsError } = await this.client
      .from("organizations")
      .select("id,name,privacy_status")
      .in(
        "id",
        memberships.map((membership) => membership.organization_id),
      );
    if (organizationsError) throw new Error(organizationsError.message);
    const organizationById = new Map(
      (organizations ?? []).map((organization) => [
        organization.id,
        organization,
      ]),
    );
    return memberships.flatMap((membership) => {
      const organization = organizationById.get(membership.organization_id);
      return organization
        ? [
            {
              membershipId: membership.id,
              organizationId: organization.id,
              organizationName: organization.name,
              organizationStatus: organization.privacy_status,
              role: membership.role,
              joinedAt: membership.created_at,
              lastActiveAt: membership.last_active_at,
            },
          ]
        : [];
    });
  }

  async getOrganizationActivity(
    organizationId: string,
    limit = 25,
  ): Promise<AdminSafeActivity[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("id,event_type,resource_type,outcome,occurred_at")
      .eq("organization_id", organizationId)
      .order("occurred_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));
    if (error) throw new Error(error.message);
    return (data ?? []).map(toSafeActivity);
  }

  async getUserActivity(
    authUserId: string,
    limit = 25,
  ): Promise<AdminSafeActivity[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("id,event_type,resource_type,outcome,occurred_at")
      .eq("actor_auth_user_id", authUserId)
      .order("occurred_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));
    if (error) throw new Error(error.message);
    return (data ?? []).map(toSafeActivity);
  }

  async getUserInvitations(email: string) {
    const { data, error } = await this.client
      .from("invitations")
      .select("id,organization_id,accepted_at,revoked_at,expires_at,created_at")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    if (!data?.length) return [];
    const { data: organizations, error: organizationError } = await this.client
      .from("organizations")
      .select("id,name")
      .in(
        "id",
        data.map((invitation) => invitation.organization_id),
      );
    if (organizationError) throw new Error(organizationError.message);
    const organizationById = new Map(
      (organizations ?? []).map((organization) => [
        organization.id,
        organization,
      ]),
    );
    return data.flatMap((invitation) => {
      const organization = organizationById.get(invitation.organization_id);
      if (!organization) return [];
      const status = invitation.accepted_at
        ? ("accepted" as const)
        : invitation.revoked_at
          ? ("revoked" as const)
          : new Date(invitation.expires_at) <= new Date()
            ? ("expired" as const)
            : ("pending" as const);
      return [
        {
          organizationId: organization.id,
          organizationName: organization.name,
          status,
          createdAt: invitation.created_at,
        },
      ];
    });
  }
}

export function toOrganizationSummary(
  row: OrganizationDirectoryRow,
): AdminOrganizationSummary {
  const failureCount =
    row.failed_job_count +
    row.failed_delivery_count +
    row.failed_export_count +
    row.failed_ai_count;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.account_status,
    plan: null,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    timezone: row.timezone,
    memberCount: row.member_count,
    activeProjectCount: row.active_project_count,
    storageBytes: row.storage_bytes,
    failedJobCount: row.failed_job_count,
    failedDeliveryCount: row.failed_delivery_count,
    failedExportCount: row.failed_export_count,
    failedAiCount: row.failed_ai_count,
    hasOperationalIssues: failureCount > 0,
  };
}

export function toUserSummary(row: UserDirectoryRow): AdminUserSummary {
  return {
    id: row.id,
    fullName: row.full_name || "Name unavailable",
    email: row.email,
    status: row.account_status,
    createdAt: row.created_at,
    lastLoginAt: row.last_sign_in_at,
    lastActivityAt: row.last_activity_at,
    emailVerified: Boolean(row.email_confirmed_at),
    authProvider: row.auth_provider,
    mfaEnabled: row.mfa_enabled,
    membershipCount: row.membership_count,
    organizationNames: row.organization_names,
  };
}

function toSafeActivity(row: {
  id: string;
  event_type: string;
  resource_type: string;
  outcome: "success" | "denied" | "failed";
  occurred_at: string;
}): AdminSafeActivity {
  return {
    id: row.id,
    action: row.event_type,
    resourceType: row.resource_type,
    outcome: row.outcome,
    occurredAt: row.occurred_at,
  };
}

function pageResult<T>(
  items: readonly T[],
  total: number,
  page: number,
  pageSize: number,
): PageResult<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function escapePostgrestFilter(value: string) {
  return value
    .replace(/[,*().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
