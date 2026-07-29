import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  CustomerHealthCounts,
  CustomerHealthListInput,
  CustomerHealthPage,
  CustomerHealthSummary,
} from "@/features/platform-admin/customer-health-types";
import { escapeLikePattern } from "@/features/platform-admin/customer-directory-validation";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

type HealthRow =
  AppDatabase["public"]["Views"]["platform_customer_health"]["Row"];

export class CustomerHealthRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async list(input: CustomerHealthListInput): Promise<CustomerHealthPage> {
    let query = this.client
      .from("platform_customer_health")
      .select("*", { count: "exact" });
    if (input.query) {
      query = z.uuid().safeParse(input.query).success
        ? query.eq("id", input.query)
        : query.ilike("name", `%${escapeLikePattern(input.query)}%`);
    }
    if (input.status !== "all") query = query.eq("health_status", input.status);
    const sortColumn = {
      health: "health_rank",
      login: "last_login_at",
      activity: "last_activity_at",
      onboarding: "onboarding_completion_percent",
      adoption: "feature_adoption_percent",
      jobs: "job_failures_30d",
    }[input.sort];
    query = query
      .order(sortColumn, {
        ascending: input.sort === "health",
        nullsFirst: false,
      })
      .order("id", { ascending: true });
    const from = (input.page - 1) * input.pageSize;
    const { data, error, count } = await query.range(
      from,
      from + input.pageSize - 1,
    );
    if (error) throw new Error(error.message);
    const total = count ?? 0;
    return {
      items: (data ?? []).map(toCustomerHealthSummary),
      total,
      page: input.page,
      pageSize: input.pageSize,
      pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    };
  }

  async counts(): Promise<CustomerHealthCounts> {
    const count = async (status?: HealthRow["health_status"]) => {
      let query = this.client
        .from("platform_customer_health")
        .select("id", { count: "exact", head: true });
      if (status) query = query.eq("health_status", status);
      const result = await query;
      if (result.error) throw new Error(result.error.message);
      return result.count ?? 0;
    };
    const [total, healthy, watch, needsAttention] = await Promise.all([
      count(),
      count("healthy"),
      count("watch"),
      count("needs_attention"),
    ]);
    return { total, healthy, watch, needsAttention };
  }
}

export function toCustomerHealthSummary(row: HealthRow): CustomerHealthSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    healthStatus: row.health_status,
    lastLoginAt: row.last_login_at,
    lastActivityAt: row.last_activity_at,
    jobFailures30d: row.job_failures_30d,
    lastJobFailureAt: row.last_job_failure_at,
    activityEvents30d: row.activity_events_30d,
    onboardingCompletionPercent: row.onboarding_completion_percent,
    adoptedFeatureCount: row.adopted_feature_count,
    availableFeatureCount: row.available_feature_count,
    featureAdoptionPercent: row.feature_adoption_percent,
  };
}
