import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import {
  assertAuthorized,
  canManageOrganization,
} from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import { hashIdentifier } from "@/features/privacy/core";
import { PrivacyRepository } from "@/features/privacy/repository";
import {
  cancellationSchema,
  organizationDeletionSchema,
  privacySettingsSchema,
  userDeletionSchema,
} from "@/features/privacy/validation";

export class PrivacyService {
  constructor(
    private readonly client: SupabaseClient<AppDatabase>,
    private readonly repository = new PrivacyRepository(client),
  ) {}

  async updateSettings(context: ActorContext, input: unknown) {
    assertAuthorized(canManageOrganization(context));
    const value = privacySettingsSchema.parse(input);
    await this.repository.updateSettings(context.organizationId, {
      soft_delete_grace_days: value.softDeleteGraceDays,
      document_retention_days: value.documentRetentionDays,
      activity_retention_days: value.activityRetentionDays,
      ai_retention_days: value.aiRetentionDays,
      audit_retention_days: value.auditRetentionDays,
      deleted_record_retention_days: value.deletedRecordRetentionDays,
    });
    return value;
  }

  async requestOrganizationDeletion(
    context: ActorContext,
    organizationName: string,
    input: unknown,
  ) {
    assertAuthorized(context.organizationRole === "owner");
    const value = organizationDeletionSchema.parse(input);
    if (value.confirmation !== organizationName)
      throw new Error("Enter the organization name exactly to continue.");
    const settings = await this.repository.getSettings(context.organizationId);
    const scheduledFor = new Date(
      Date.now() + settings.soft_delete_grace_days * 86_400_000,
    ).toISOString();
    const request = await this.repository.createRequest({
      organization_id: context.organizationId,
      organization_identifier_hash: hashIdentifier(context.organizationId),
      requested_by_auth_user_id: context.authUserId,
      requested_by_user_id: context.userId,
      scope: value.scope,
      scheduled_for: scheduledFor,
      metadata: { confirmationVersion: 1 },
    });
    const { error } = await this.client
      .from("organizations")
      .update({
        deletion_requested_at: request.requested_at,
        scheduled_deletion_at: scheduledFor,
        privacy_status: "pending_deletion",
      })
      .eq("id", context.organizationId);
    if (error) throw new Error(error.message);
    return request;
  }

  async requestUserDeletion(context: ActorContext, input: unknown) {
    userDeletionSchema.parse(input);
    const { data: owned, error: ownerError } = await this.client
      .from("organization_memberships")
      .select("organization_id")
      .eq("auth_user_id", context.authUserId)
      .eq("role", "owner");
    if (ownerError) throw new Error(ownerError.message);
    for (const membership of owned) {
      const { count, error } = await this.client
        .from("organization_memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("role", "owner");
      if (error) throw new Error(error.message);
      if ((count ?? 0) <= 1)
        throw new Error("Transfer ownership before deleting your account.");
    }
    const settings = await this.repository.getSettings(context.organizationId);
    const scheduledFor = new Date(
      Date.now() + settings.soft_delete_grace_days * 86_400_000,
    ).toISOString();
    const request = await this.repository.createRequest({
      organization_id: context.organizationId,
      requested_by_auth_user_id: context.authUserId,
      requested_by_user_id: context.userId,
      target_auth_user_id: context.authUserId,
      target_user_id: context.userId,
      scope: "user_only",
      scheduled_for: scheduledFor,
      metadata: { allMemberships: true },
    });
    const { error } = await this.client
      .from("users")
      .update({
        deletion_requested_at: request.requested_at,
        scheduled_deletion_at: scheduledFor,
      })
      .eq("auth_user_id", context.authUserId);
    if (error) throw new Error(error.message);
    return request;
  }

  async cancel(context: ActorContext, input: unknown) {
    const value = cancellationSchema.parse(input);
    const existing = await this.repository.getRequest(value.requestId);
    assertAuthorized(
      existing.requested_by_auth_user_id === context.authUserId ||
        (existing.organization_id === context.organizationId &&
          context.organizationRole === "owner"),
    );
    const request = await this.repository.cancelRequest(value.requestId);
    if (request.scope === "user_only") {
      await this.client.from("users").update({
        deletion_requested_at: null,
        scheduled_deletion_at: null,
      }).eq("auth_user_id", request.target_auth_user_id!);
    } else if (request.organization_id) {
      await this.client.from("organizations").update({
        deletion_requested_at: null,
        scheduled_deletion_at: null,
        privacy_status: "active",
      }).eq("id", request.organization_id);
    }
    return request;
  }
}
