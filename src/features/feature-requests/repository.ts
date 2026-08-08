import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type {
  FeatureRequestInput,
  FeatureRequestPriority,
  FeatureRequestStatus,
} from "./types";

export class FeatureRequestRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async findIdempotent(
    organizationId: string,
    reportingUserId: string,
    idempotencyKey: string,
  ) {
    const { data, error } = await this.client
      .from("feature_requests")
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
    input: FeatureRequestInput,
    system: { applicationVersion: string; environment: string },
  ) {
    const { data, error } = await this.client
      .from("feature_requests")
      .insert({
        organization_id: organizationId,
        reporting_user_id: reportingUserId,
        title: input.title,
        description: input.description,
        use_case: input.useCase ?? null,
        desired_outcome: input.desiredOutcome ?? null,
        relevant_route: input.relevantRoute ?? null,
        relevant_feature: input.relevantFeature ?? null,
        customer_priority: input.priority ?? null,
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
    requestId: string;
    organizationId: string;
    path: string;
    filename: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    size: number;
  }) {
    const { error } = await this.client
      .from("feature_request_attachments")
      .insert({
        feature_request_id: input.requestId,
        organization_id: input.organizationId,
        storage_path: input.path,
        original_filename: input.filename,
        mime_type: input.mimeType,
        size_bytes: input.size,
      });
    if (error) throw new Error(error.message);
  }
}

export class FeatureRequestAdminRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async list(input: {
    search?: string | undefined;
    status?: FeatureRequestStatus | undefined;
    priority?: FeatureRequestPriority | undefined;
    organizationId?: string | undefined;
    order?: "newest" | "oldest" | "priority" | undefined;
    createdAfter?: string | undefined;
    createdBefore?: string | undefined;
  }) {
    let query = this.client.from("feature_requests").select("*").limit(100);
    if (input.search) {
      const safe = input.search.replace(/[%_,()]/g, " ").trim();
      if (safe) {
        const [organizations, users] = await Promise.all([
          this.client
            .from("organizations")
            .select("id")
            .ilike("name", `%${safe}%`)
            .limit(50),
          this.client
            .from("users")
            .select("id")
            .or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
            .limit(50),
        ]);
        if (organizations.error) throw new Error(organizations.error.message);
        if (users.error) throw new Error(users.error.message);
        const clauses = [`title.ilike.%${safe}%`];
        if (/^[0-9a-f-]{36}$/i.test(safe)) clauses.push(`id.eq.${safe}`);
        const organizationIds = organizations.data.map(({ id }) => id);
        if (organizationIds.length)
          clauses.push(`organization_id.in.(${organizationIds.join(",")})`);
        const userIds = users.data.map(({ id }) => id);
        if (userIds.length)
          clauses.push(`reporting_user_id.in.(${userIds.join(",")})`);
        query = query.or(clauses.join(","));
      }
    }
    if (input.status) query = query.eq("status", input.status);
    if (input.priority) query = query.eq("customer_priority", input.priority);
    if (input.organizationId)
      query = query.eq("organization_id", input.organizationId);
    if (input.createdAfter) query = query.gte("created_at", input.createdAfter);
    if (input.createdBefore)
      query = query.lte("created_at", input.createdBefore);
    query =
      input.order === "oldest"
        ? query.order("created_at", { ascending: true })
        : query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (input.order !== "priority") return data;
    const rank: Record<FeatureRequestPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return data.toSorted(
      (left, right) =>
        (left.customer_priority ? rank[left.customer_priority] : 4) -
          (right.customer_priority ? rank[right.customer_priority] : 4) ||
        right.created_at.localeCompare(left.created_at),
    );
  }

  async get(requestId: string) {
    const { data, error } = await this.client
      .from("feature_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const [
      organization,
      reportingUser,
      attachments,
      notes,
      operators,
      releases,
    ] = await Promise.all([
      this.client
        .from("organizations")
        .select("id,name")
        .eq("id", data.organization_id)
        .single(),
      this.client
        .from("users")
        .select("email,full_name")
        .eq("id", data.reporting_user_id)
        .maybeSingle(),
      this.client
        .from("feature_request_attachments")
        .select("*")
        .eq("feature_request_id", requestId)
        .order("created_at"),
      this.client
        .from("feature_request_internal_notes")
        .select("*")
        .eq("feature_request_id", requestId)
        .order("created_at", { ascending: false }),
      this.client
        .from("platform_operators")
        .select("id,display_name")
        .eq("status", "active")
        .order("display_name"),
      this.client
        .from("releases")
        .select("id,release_identifier")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    for (const result of [
      organization,
      reportingUser,
      attachments,
      notes,
      operators,
      releases,
    ])
      if (result.error) throw new Error(result.error.message);
    return {
      request: data,
      organization: organization.data,
      reportingUser: reportingUser.data,
      attachments: attachments.data ?? [],
      notes: notes.data ?? [],
      operators: operators.data ?? [],
      releases: releases.data ?? [],
    };
  }

  async update(
    requestId: string,
    input: {
      status: FeatureRequestStatus;
      assignedOperatorId: string | null;
      resolutionNotes?: string | undefined;
      relatedReleaseId: string | null;
      externalIssueReference?: string | undefined;
    },
  ) {
    const { error } = await this.client
      .from("feature_requests")
      .update({
        status: input.status,
        assigned_operator_id: input.assignedOperatorId,
        resolution_notes: input.resolutionNotes ?? null,
        related_release_id: input.relatedReleaseId,
        external_issue_reference: input.externalIssueReference ?? null,
        resolved_at:
          input.status === "released" || input.status === "declined"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", requestId);
    if (error) throw new Error(error.message);
  }

  async addNote(requestId: string, operatorId: string, body: string) {
    const { error } = await this.client
      .from("feature_request_internal_notes")
      .insert({ feature_request_id: requestId, operator_id: operatorId, body });
    if (error) throw new Error(error.message);
  }
}
