import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DOCUMENT_BUCKET } from "@/features/documents/validation";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import { hashIdentifier } from "@/features/privacy/core";

type DeletionRequest =
  AppDatabase["public"]["Tables"]["privacy_deletion_requests"]["Row"];

export class PrivacyCleanupService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async run(batchSize = 20) {
    const { data, error } = await this.client.rpc(
      "claim_due_privacy_requests",
      { batch_size: batchSize },
    );
    if (error) throw new Error(error.message);
    const results = [];
    for (const request of data) {
      try {
        await this.process(request);
        results.push({ id: request.id, status: "completed" as const });
      } catch (error) {
        await this.fail(request.id, privacyFailureCode(error));
        results.push({ id: request.id, status: "failed" as const });
      }
    }
    const retention = await this.applyRetentionPolicies();
    return { requests: results, retention };
  }

  private async process(request: DeletionRequest) {
    if (request.scope === "user_only") {
      await this.deleteUser(request);
    } else if (request.scope === "organization_only") {
      await this.archiveOrganization(request);
    } else {
      await this.deleteOrganizationData(request);
    }
    const { error: completionError } = await this.client
      .from("privacy_deletion_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        failure_code: null,
      })
      .eq("id", request.id)
      .eq("status", "processing");
    if (completionError) throw new Error(completionError.message);
  }

  private async deleteUser(request: DeletionRequest) {
    if (!request.target_auth_user_id) throw new Error("missing_user_target");
    const authUserId = request.target_auth_user_id;
    const { data: users, error } = await this.client
      .from("users")
      .select("id,organization_id")
      .eq("auth_user_id", authUserId);
    if (error) throw new Error(error.message);
    for (const user of users) {
      const { error: updateError } = await this.client
        .from("users")
        .update({
          auth_user_id: null,
          full_name: "Deleted user",
          email: `deleted+${user.id}@privacy.invalid`,
          title: null,
          deletion_requested_at: null,
          scheduled_deletion_at: null,
        })
        .eq("id", user.id)
        .eq("organization_id", user.organization_id);
      if (updateError) throw new Error(updateError.message);
    }
    const { error: membershipError } = await this.client
      .from("organization_memberships")
      .delete()
      .eq("auth_user_id", authUserId);
    if (membershipError) throw new Error(membershipError.message);
    const { error: authError } =
      await this.client.auth.admin.deleteUser(authUserId);
    if (authError && !/not found/i.test(authError.message))
      throw new Error(authError.message);
    await this.appendDeletionAudit(request, "privacy.user_deleted");
  }

  private async archiveOrganization(request: DeletionRequest) {
    if (!request.organization_id) throw new Error("missing_organization_target");
    const organizationId = request.organization_id;
    const { data: organization, error } = await this.client
      .from("organizations")
      .select("legal_hold_enabled")
      .eq("id", organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!organization) return;
    if (organization.legal_hold_enabled) throw new Error("legal_hold");
    const { error: membershipError } = await this.client
      .from("organization_memberships")
      .delete()
      .eq("organization_id", organizationId);
    if (membershipError) throw new Error(membershipError.message);
    const { error: invitationError } = await this.client
      .from("invitations")
      .delete()
      .eq("organization_id", organizationId);
    if (invitationError) throw new Error(invitationError.message);
    const { error: organizationError } = await this.client
      .from("organizations")
      .update({
        name: "Deleted organization",
        slug: `deleted-${organizationId}`,
        logo_url: null,
        privacy_status: "archived",
        deletion_requested_at: null,
        scheduled_deletion_at: null,
      })
      .eq("id", organizationId);
    if (organizationError) throw new Error(organizationError.message);
    await this.appendDeletionAudit(request, "privacy.organization_archived");
  }

  private async deleteOrganizationData(request: DeletionRequest) {
    if (!request.organization_id) throw new Error("missing_organization_target");
    const organizationId = request.organization_id;
    const { data: organization, error } = await this.client
      .from("organizations")
      .select("legal_hold_enabled")
      .eq("id", organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!organization) {
      await this.appendDeletionAudit(request, "privacy.organization_deleted");
      return;
    }
    if (organization.legal_hold_enabled) throw new Error("legal_hold");
    await this.removeOrganizationStorage(organizationId);
    const { error: deleteError } = await this.client
      .from("organizations")
      .delete()
      .eq("id", organizationId);
    if (deleteError) throw new Error(deleteError.message);
    await this.appendDeletionAudit(request, "privacy.organization_deleted");
  }

  private async removeOrganizationStorage(organizationId: string) {
    const { data, error } = await this.client
      .from("documents")
      .select("storage_path")
      .eq("organization_id", organizationId)
      .not("storage_path", "is", null);
    if (error) throw new Error(error.message);
    const paths = data.flatMap((document) => document.storage_path ?? []);
    for (let index = 0; index < paths.length; index += 100) {
      const { error: storageError } = await this.client.storage
        .from(DOCUMENT_BUCKET)
        .remove(paths.slice(index, index + 100));
      if (storageError) throw new Error(storageError.message);
    }
  }

  private async applyRetentionPolicies() {
    const { data: settings, error } = await this.client
      .from("organization_privacy_settings")
      .select("*");
    if (error) throw new Error(error.message);
    const results = [];
    for (const setting of settings) {
      const { data: organization } = await this.client
        .from("organizations")
        .select("legal_hold_enabled")
        .eq("id", setting.organization_id)
        .maybeSingle();
      if (organization?.legal_hold_enabled) {
        results.push({ organizationId: setting.organization_id, legalHold: true });
        continue;
      }
      const cutoff = new Date(
        Date.now() - setting.document_retention_days * 86_400_000,
      ).toISOString();
      const { data: documents, error: documentError } = await this.client
        .from("documents")
        .select("id,storage_path")
        .eq("organization_id", setting.organization_id)
        .not("archived_at", "is", null)
        .lt("archived_at", cutoff);
      if (documentError) throw new Error(documentError.message);
      const paths = documents.flatMap((document) => document.storage_path ?? []);
      for (let index = 0; index < paths.length; index += 100) {
        const { error: storageError } = await this.client.storage
          .from(DOCUMENT_BUCKET)
          .remove(paths.slice(index, index + 100));
        if (storageError) throw new Error(storageError.message);
      }
      if (documents.length) {
        const { error: deleteError } = await this.client
          .from("documents")
          .delete()
          .eq("organization_id", setting.organization_id)
          .in("id", documents.map((document) => document.id));
        if (deleteError) throw new Error(deleteError.message);
      }
      const { data: purged, error: purgeError } = await this.client.rpc(
        "purge_expired_organization_data",
        { target_organization_id: setting.organization_id },
      );
      if (purgeError) throw new Error(purgeError.message);
      results.push({
        organizationId: setting.organization_id,
        documents: documents.length,
        purged,
      });
    }
    return results;
  }

  private async appendDeletionAudit(request: DeletionRequest, action: string) {
    const { data: existing, error: lookupError } = await this.client
      .from("audit_logs")
      .select("id")
      .eq("resource_type", "privacy_deletion_request")
      .eq("resource_id", request.id)
      .eq("event_type", action)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing) return;
    const { error } = await this.client.from("audit_logs").insert({
      organization_id:
        action === "privacy.organization_deleted" ? null : request.organization_id,
      actor_auth_user_id: null,
      actor_user_id: null,
      event_type: action,
      resource_type: "privacy_deletion_request",
      resource_id: request.id,
      metadata: {
        scope: request.scope,
        organizationIdentifierHash:
          request.organization_identifier_hash ??
          (request.organization_id
            ? hashIdentifier(request.organization_id)
            : null),
        requestedByAuthUserHash: request.requested_by_auth_user_id
          ? hashIdentifier(request.requested_by_auth_user_id)
          : null,
      },
    });
    if (error) throw new Error(error.message);
  }

  private async fail(id: string, failureCode: string) {
    const { error } = await this.client
      .from("privacy_deletion_requests")
      .update({ status: "failed", failure_code: failureCode })
      .eq("id", id)
      .eq("status", "processing");
    if (error) throw new Error(error.message);
  }
}

function privacyFailureCode(error: unknown) {
  if (error instanceof Error && error.message === "legal_hold")
    return "legal_hold";
  return "cleanup_failed";
}
