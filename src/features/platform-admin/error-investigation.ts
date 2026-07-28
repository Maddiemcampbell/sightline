import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";

type ErrorReport =
  AppDatabase["public"]["Tables"]["application_error_reports"]["Row"];

export type ErrorInvestigation = Readonly<{
  report: ErrorReport;
  organization: Readonly<{ id: string; name: string }> | null;
  affectedUser: Readonly<{
    id: string;
    fullName: string;
    email: string;
  }> | null;
  affectedAuthEmail: string | null;
  relatedRelease: Readonly<{
    id: string;
    identifier: string;
    applicationVersion: string;
    commitSha: string | null;
    status: string;
    deployedAt: string | null;
  }> | null;
  similar: readonly ErrorReport[];
  similarCount: number;
}>;

export class ErrorInvestigationService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async get(id: string): Promise<ErrorInvestigation | null> {
    const reportResult = await this.client
      .from("application_error_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (reportResult.error) throw new Error(reportResult.error.message);
    const report = reportResult.data;
    if (!report) return null;

    let similarQuery = this.client
      .from("application_error_reports")
      .select("*", { count: "exact" })
      .eq("environment", report.environment)
      .eq("source", report.source)
      .eq("error_name", report.error_name)
      .neq("id", report.id)
      .order("occurred_at", { ascending: false })
      .limit(10);
    similarQuery = report.request_path
      ? similarQuery.eq("request_path", report.request_path)
      : similarQuery.is("request_path", null);

    const [organization, user, release, similar, authUser] = await Promise.all([
      report.organization_id
        ? this.client
            .from("organizations")
            .select("id,name")
            .eq("id", report.organization_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      report.application_user_id && report.organization_id
        ? this.client
            .from("users")
            .select("id,full_name,email")
            .eq("id", report.application_user_id)
            .eq("organization_id", report.organization_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      this.client
        .from("releases")
        .select(
          "id,release_identifier,application_version,commit_sha,status,deployed_at",
        )
        .eq("environment", report.environment)
        .eq("application_version", report.application_version)
        .order("deployed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      similarQuery,
      report.auth_user_id
        ? this.client.auth.admin.getUserById(report.auth_user_id)
        : Promise.resolve({ data: { user: null }, error: null }),
    ]);
    for (const result of [organization, user, release, similar]) {
      if (result.error) throw new Error(result.error.message);
    }

    return {
      report,
      organization: organization.data,
      affectedUser: user.data
        ? {
            id: user.data.id,
            fullName: user.data.full_name,
            email: user.data.email,
          }
        : null,
      affectedAuthEmail: authUser.error
        ? null
        : (authUser.data.user?.email ?? null),
      relatedRelease: release.data
        ? {
            id: release.data.id,
            identifier: release.data.release_identifier,
            applicationVersion: release.data.application_version,
            commitSha: release.data.commit_sha,
            status: release.data.status,
            deployedAt: release.data.deployed_at,
          }
        : null,
      similar: similar.data ?? [],
      similarCount: similar.count ?? 0,
    };
  }
}
