import "server-only";

import { auditRequestContext, AuditService } from "@/features/audit/core";
import { AuditLogRepository } from "@/features/audit/repository";
import {
  buildExportArtifact,
  type ExportDataset,
  type ExportManifest,
} from "@/features/data-exports/archive";
import { NotificationRepository } from "@/features/notifications/repository";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectAllRows } from "@/lib/supabase/pagination";

export const EXPORT_BUCKET = "organization-exports";
export const EXPORT_TTL_DAYS = 7;
type ExportJob = AppDatabase["public"]["Tables"]["organization_data_exports"]["Row"];

export class DataExportWorker {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async run(batchSize = 5) {
    const expired = await this.expireArtifacts();
    const { data, error } = await this.client.rpc(
      "claim_organization_data_exports",
      { batch_size: batchSize },
    );
    if (error) throw new Error(error.message);
    const results = [];
    for (const job of data) {
      try {
        await this.process(job);
        results.push({ id: job.id, status: "ready" as const });
      } catch {
        await this.fail(job);
        results.push({ id: job.id, status: "failed" as const });
      }
    }
    return { expired, exports: results };
  }

  private async process(job: ExportJob) {
    const { data: organization, error } = await this.client
      .from("organizations")
      .select("name")
      .eq("id", job.organization_id)
      .single();
    if (error) throw new Error(error.message);
    const datasets = await this.loadDatasets(job.organization_id);
    const generatedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * 86_400_000).toISOString();
    const manifest: ExportManifest = {
      schemaVersion: "1.0",
      exportId: job.id,
      organizationId: job.organization_id,
      organizationName: organization.name,
      generatedAt,
      format: job.export_format,
      expiresAt,
      datasets: datasets.map((dataset) => ({
        name: dataset.name,
        records: dataset.rows.length,
        files:
          job.export_format === "json"
            ? ["data.json"]
            : job.export_format === "csv"
              ? [`${dataset.name}.csv`]
              : [`${dataset.name}.csv`, "data.json"],
      })),
      exclusions: [
        "authentication credentials and sessions",
        "API keys and integration credentials",
        "storage object paths",
        "AI provider, model, prompt, latency, and token telemetry",
        "internal audit and system metadata",
      ],
    };
    const artifact = buildExportArtifact(job.export_format, manifest, datasets);
    const path = `${job.organization_id}/${job.id}/${artifact.name}`;
    const { error: uploadError } = await this.client.storage
      .from(EXPORT_BUCKET)
      .upload(path, artifact.contents, {
        contentType: artifact.mimeType,
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);
    const { error: updateError } = await this.client
      .from("organization_data_exports")
      .update({
        status: "ready",
        storage_path: path,
        artifact_name: artifact.name,
        artifact_mime_type: artifact.mimeType,
        artifact_size_bytes: artifact.contents.length,
        checksum_sha256: artifact.checksum,
        manifest,
        completed_at: generatedAt,
        expires_at: expiresAt,
        failure_code: null,
      })
      .eq("id", job.id)
      .eq("organization_id", job.organization_id)
      .eq("status", "processing");
    if (updateError) throw new Error(updateError.message);
    if (job.requested_by_membership_id) {
      await new NotificationRepository(this.client).create({
        organizationId: job.organization_id,
        recipientMembershipId: job.requested_by_membership_id,
        type: "data_export_ready",
        title: "Your data export is ready",
        body: `The ${job.export_format.toUpperCase()} export is available for seven days.`,
        href: "/settings/data-export",
        payload: { exportId: job.id, expiresAt },
      });
    }
    await this.audit(job, "data_export.completed", {
      format: job.export_format,
      expiresAt,
      checksumSha256: artifact.checksum,
    });
  }

  private async loadDatasets(organizationId: string): Promise<ExportDataset[]> {
    const results = await Promise.all([
      exportRows(this.client.from("projects").select("id,name,project_number,status,address_line_1,city,state_code,postal_code,start_date,target_completion_date,created_at,updated_at").eq("organization_id", organizationId)),
      collectAllRows((from, to) => this.client.from("risks").select("id,project_id,vendor_id,title,summary,category,severity,status,confidence_score,why_it_matters,detected_at,due_at,resolved_at,created_at,updated_at", { count: "exact" }).eq("organization_id", organizationId).order("id").range(from, to)),
      exportRows(this.client.from("recommended_actions").select("id,risk_id,owner_user_id,title,description,status,priority,action_type,due_at,completed_at,dismissed_at,dismissal_reason,source,created_at,updated_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("documents").select("id,project_id,vendor_id,name,original_filename,document_type,document_date,mime_type,size_bytes,processing_status,archived_at,created_at,updated_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("vendors").select("id,name,trade,contact_name,contact_email,created_at,updated_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("risk_activities").select("id,risk_id,actor_user_id,actor_type,activity_type,from_status,to_status,summary,occurred_at,created_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("collaboration_comments").select("id,project_id,subject_type,subject_id,author_membership_id,body_markdown,edited_at,deleted_at,created_at,updated_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("risk_conversations").select("id,risk_id,user_id,created_at,updated_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("risk_conversation_messages").select("id,conversation_id,role,content,answer_status,evidence_ids,confidence,missing_information,suggested_follow_ups,created_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("daily_briefs").select("id,brief_date,status,headline,introduction,published_at,created_at,updated_at").eq("organization_id", organizationId)),
      exportRows(this.client.from("brief_items").select("id,daily_brief_id,risk_id,priority,headline,summary,recommended_next_step,created_at").eq("organization_id", organizationId)),
    ]);
    const names = [
      "projects", "risks", "actions", "documents", "vendors", "activity",
      "comments", "ai_conversations", "ai_messages", "daily_briefs", "daily_brief_items",
    ];
    return results.map((rows, index) => ({ name: names[index]!, rows }));
  }

  private async expireArtifacts() {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("organization_data_exports")
      .select("id,organization_id,storage_path")
      .eq("status", "ready")
      .lt("expires_at", now);
    if (error) throw new Error(error.message);
    for (const job of data) {
      if (job.storage_path) {
        const { error: removeError } = await this.client.storage
          .from(EXPORT_BUCKET)
          .remove([job.storage_path]);
        if (removeError) throw new Error(removeError.message);
      }
      const { error: updateError } = await this.client
        .from("organization_data_exports")
        .update({
          status: "expired",
          expired_at: now,
          storage_path: null,
        })
        .eq("id", job.id)
        .eq("organization_id", job.organization_id)
        .eq("status", "ready");
      if (updateError) throw new Error(updateError.message);
    }
    return data.length;
  }

  private async fail(job: ExportJob) {
    await this.client
      .from("organization_data_exports")
      .update({ status: "failed", failure_code: "generation_failed" })
      .eq("id", job.id)
      .eq("organization_id", job.organization_id)
      .eq("status", "processing");
    await this.audit(job, "data_export.failed", { format: job.export_format });
  }

  private async audit(
    job: ExportJob,
    action: "data_export.completed" | "data_export.failed",
    metadata: Record<string, string>,
  ) {
    await new AuditService(new AuditLogRepository(this.client)).record(
      {
        organizationId: job.organization_id,
        actorAuthUserId: job.requested_by_auth_user_id,
        actorUserId: null,
        action,
        resourceType: "organization_data_export",
        resourceId: job.id,
        metadata,
      },
      auditRequestContext(new Headers()),
    );
  }
}

async function exportRows<T extends Record<string, unknown>>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
