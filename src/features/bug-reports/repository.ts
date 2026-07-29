import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BugReportInput } from "./types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class BugReportRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async findIdempotent(
    organizationId: string,
    reportingUserId: string,
    idempotencyKey: string,
  ) {
    const { data, error } = await this.client
      .from("bug_reports")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("reporting_user_id", reportingUserId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  }

  async create(
    organizationId: string,
    reportingUserId: string,
    input: BugReportInput,
    system: { applicationVersion: string; environment: string },
  ) {
    const { data, error } = await this.client
      .from("bug_reports")
      .insert({
        organization_id: organizationId,
        reporting_user_id: reportingUserId,
        title: input.title,
        description: input.description,
        steps_to_reproduce: input.stepsToReproduce ?? null,
        expected_behavior: input.expectedBehavior ?? null,
        actual_behavior: input.actualBehavior ?? null,
        customer_severity: input.severity ?? null,
        relevant_route: input.relevantRoute ?? null,
        relevant_feature: input.relevantFeature ?? null,
        diagnostic_consent: input.diagnosticConsent,
        application_version: system.applicationVersion,
        environment: system.environment,
        browser_os: input.diagnosticConsent ? (input.browserOs ?? null) : null,
        viewport_width: input.diagnosticConsent
          ? (input.viewportWidth ?? null)
          : null,
        viewport_height: input.diagnosticConsent
          ? (input.viewportHeight ?? null)
          : null,
        correlation_id: input.correlationId,
        client_error_reference: input.diagnosticConsent
          ? (input.clientErrorReference ?? null)
          : null,
        idempotency_key: input.idempotencyKey,
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const existing = await this.findIdempotent(
        organizationId,
        reportingUserId,
        input.idempotencyKey,
      );
      if (existing) return existing;
    }
    if (error) throw new Error(error.message);
    return data.id;
  }

  async addAttachment(input: {
    reportId: string;
    organizationId: string;
    path: string;
    filename: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    size: number;
  }) {
    const { error } = await this.client.from("bug_report_attachments").insert({
      bug_report_id: input.reportId,
      organization_id: input.organizationId,
      storage_path: input.path,
      original_filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: input.size,
    });
    if (error) throw new Error(error.message);
  }
}
