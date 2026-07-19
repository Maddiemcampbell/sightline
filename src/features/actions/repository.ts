import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { RecommendedActionRow } from "@/lib/supabase/database-row.types";

export type ActionPatch = Partial<
  Pick<
    RecommendedActionRow,
    | "status"
    | "owner_user_id"
    | "priority"
    | "due_at"
    | "completed_at"
    | "dismissed_at"
    | "dismissal_reason"
  >
>;

export class RecommendedActionRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async get(
    context: ActorContext,
    actionId: string,
  ): Promise<RecommendedActionRow> {
    const { data, error } = await this.client
      .from("recommended_actions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", actionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Action not found.");
    return data;
  }

  async update(
    context: ActorContext,
    actionId: string,
    patch: ActionPatch,
  ): Promise<RecommendedActionRow> {
    const { data, error } = await this.client
      .from("recommended_actions")
      .update(patch)
      .eq("organization_id", context.organizationId)
      .eq("id", actionId)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Action was not updated.");
    return data;
  }

  async userExists(context: ActorContext, userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("users")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }
}
