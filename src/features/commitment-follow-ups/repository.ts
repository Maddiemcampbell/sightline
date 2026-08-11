import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class CommitmentFollowUpRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async forDraft(context: ActorContext, draftId: string) {
    const { data, error } = await this.client
      .from("commitment_follow_ups")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("email_draft_id", draftId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async get(context: ActorContext, id: string) {
    const { data, error } = await this.client
      .from("commitment_follow_ups")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Follow-up not found.");
    return data;
  }

  async create(
    context: ActorContext,
    values: AppDatabase["public"]["Tables"]["commitment_follow_ups"]["Insert"],
  ) {
    if (values.organization_id !== context.organizationId)
      throw new Error("Organization access denied.");
    const { data, error } = await this.client
      .from("commitment_follow_ups")
      .insert(values)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Follow-up could not be created.");
    return data;
  }

  async update(
    context: ActorContext,
    id: string,
    values: AppDatabase["public"]["Tables"]["commitment_follow_ups"]["Update"],
  ) {
    const { data, error } = await this.client
      .from("commitment_follow_ups")
      .update(values)
      .eq("organization_id", context.organizationId)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Follow-up could not be updated.");
    return data;
  }
}
