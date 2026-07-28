import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { BugSeverity, BugStatus } from "./types";

export class BugReportAdminRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async list(input: {
    search?: string | undefined;
    status?: BugStatus | undefined;
    severity?: BugSeverity | undefined;
    organizationId?: string | undefined;
    order?: "newest" | "oldest" | "severity" | undefined;
    createdAfter?: string | undefined;
    createdBefore?: string | undefined;
  }) {
    let query = this.client
      .from("bug_reports")
      .select("*")
      .limit(100);
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
    if (input.severity)
      query = query.eq("customer_severity", input.severity);
    if (input.organizationId)
      query = query.eq("organization_id", input.organizationId);
    if (input.createdAfter) query = query.gte("created_at", input.createdAfter);
    if (input.createdBefore) query = query.lte("created_at", input.createdBefore);
    query =
      input.order === "oldest"
        ? query.order("created_at", { ascending: true })
        : input.order === "severity"
          ? query
              .order("customer_severity", {
                ascending: true,
                nullsFirst: false,
              })
              .order("created_at", { ascending: false })
          : query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (input.order !== "severity") return data;
    const rank: Record<NonNullable<(typeof data)[number]["customer_severity"]>, number> = {
      blocking: 0,
      major: 1,
      minor: 2,
      cosmetic: 3,
    };
    return data.toSorted(
      (left, right) =>
        (left.customer_severity ? rank[left.customer_severity] : 4) -
          (right.customer_severity ? rank[right.customer_severity] : 4) ||
        right.created_at.localeCompare(left.created_at),
    );
  }

  async get(reportId: string) {
    const { data, error } = await this.client
      .from("bug_reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const [organization, attachments, notes, operators, releases] =
      await Promise.all([
        this.client
          .from("organizations")
          .select("id,name")
          .eq("id", data.organization_id)
          .single(),
        this.client
          .from("bug_report_attachments")
          .select("*")
          .eq("bug_report_id", reportId)
          .order("created_at"),
        this.client
          .from("bug_report_internal_notes")
          .select("*")
          .eq("bug_report_id", reportId)
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
      attachments,
      notes,
      operators,
      releases,
    ])
      if (result.error) throw new Error(result.error.message);
    return {
      report: data,
      organization: organization.data,
      attachments: attachments.data ?? [],
      notes: notes.data ?? [],
      operators: operators.data ?? [],
      releases: releases.data ?? [],
    };
  }

  async update(
    reportId: string,
    input: {
      status: BugStatus;
      assignedOperatorId: string | null;
      resolutionNotes?: string | undefined;
      relatedReleaseId: string | null;
      externalIssueReference?: string | undefined;
    },
  ) {
    const { error } = await this.client
      .from("bug_reports")
      .update({
        status: input.status,
        assigned_operator_id: input.assignedOperatorId,
        resolution_notes: input.resolutionNotes ?? null,
        related_release_id: input.relatedReleaseId,
        external_issue_reference: input.externalIssueReference ?? null,
        resolved_at:
          input.status === "resolved" || input.status === "closed"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", reportId);
    if (error) throw new Error(error.message);
  }

  async addNote(reportId: string, operatorId: string, body: string) {
    const { error } = await this.client
      .from("bug_report_internal_notes")
      .insert({ bug_report_id: reportId, operator_id: operatorId, body });
    if (error) throw new Error(error.message);
  }
}
