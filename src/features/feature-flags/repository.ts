import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { FeatureFlag } from "./types";
import type { FeatureFlagMutation } from "./validation";
import type { Json } from "@/lib/supabase/database.types";

export class FeatureFlagRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async findByKey(key: string): Promise<FeatureFlag | null> {
    const { data, error } = await this.client
      .from("feature_flags")
      .select("*")
      .eq("flag_key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toFeatureFlag(data) : null;
  }

  async list(input: { query: string; status: string; environment: string }) {
    let request = this.client
      .from("feature_flags")
      .select("*")
      .order("updated_at", { ascending: false });
    if (input.query)
      request = request.or(
        `flag_key.ilike.*${safeSearch(input.query)}*,name.ilike.*${safeSearch(input.query)}*`,
      );
    if (input.status === "enabled") request = request.eq("enabled", true);
    if (input.status === "disabled") request = request.eq("enabled", false);
    if (input.environment !== "all")
      request = request.contains("environments", [input.environment]);
    const { data, error } = await request.limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFeatureFlag);
  }

  async create(input: FeatureFlagMutation, operatorId: string) {
    const { data, error } = await this.client
      .from("feature_flags")
      .insert({
        ...toRow(input, operatorId),
        created_by_operator_id: operatorId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await this.change(data.id, operatorId, "created", null, data);
    return toFeatureFlag(data);
  }

  async update(id: string, input: FeatureFlagMutation, operatorId: string) {
    const previous = await this.client
      .from("feature_flags")
      .select("*")
      .eq("id", id)
      .single();
    if (previous.error) throw new Error(previous.error.message);
    const { data, error } = await this.client
      .from("feature_flags")
      .update(toRow(input, operatorId))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const changeType =
      previous.data.enabled !== data.enabled
        ? data.enabled
          ? "enabled"
          : "disabled"
        : "updated";
    await this.change(id, operatorId, changeType, previous.data, data);
    return toFeatureFlag(data);
  }

  async changes(limit = 30) {
    const { data, error } = await this.client
      .from("feature_flag_changes")
      .select(
        "id,change_type,new_state,created_at,feature_flags(flag_key,name)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async logEvaluation(input: {
    flag: FeatureFlag | null;
    key: string;
    environment: string;
    organizationId: string | null;
    userId: string | null;
    result: boolean;
    reason: string;
    correlationId: string | null;
  }) {
    const { error } = await this.client
      .from("feature_flag_evaluation_logs")
      .insert({
        feature_flag_id: input.flag?.id ?? null,
        flag_key: input.key,
        environment: input.environment,
        organization_id: input.organizationId,
        user_id: input.userId,
        result: input.result,
        reason: input.reason,
        correlation_id: input.correlationId,
      });
    if (error) throw new Error(error.message);
  }

  private async change(
    flagId: string,
    operatorId: string,
    changeType: "created" | "updated" | "enabled" | "disabled",
    previousState: Json | null,
    newState: Json,
  ) {
    const { error } = await this.client.from("feature_flag_changes").insert({
      feature_flag_id: flagId,
      operator_id: operatorId,
      change_type: changeType,
      previous_state: previousState,
      new_state: newState,
    });
    if (error) throw new Error(error.message);
  }
}

function toFeatureFlag(
  row: AppDatabase["public"]["Tables"]["feature_flags"]["Row"],
): FeatureFlag {
  return {
    id: row.id,
    key: row.flag_key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    defaultEnabled: row.default_enabled,
    environments: row.environments,
    organizationIds: row.organization_ids,
    userIds: row.user_ids,
    rolloutPercentage: row.rollout_percentage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: FeatureFlagMutation, operatorId: string) {
  return {
    flag_key: input.key,
    name: input.name,
    description: input.description,
    enabled: input.enabled,
    default_enabled: input.defaultEnabled,
    environments: input.environments,
    organization_ids: input.organizationIds,
    user_ids: input.userIds,
    rollout_percentage: input.rolloutPercentage,
    updated_by_operator_id: operatorId,
  };
}

function safeSearch(value: string) {
  return value.replace(/[,*().]/g, "").slice(0, 80);
}
