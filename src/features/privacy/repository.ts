import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class PrivacyRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async getSettings(organizationId: string) {
    const { data, error } = await this.client
      .from("organization_privacy_settings")
      .select("*")
      .eq("organization_id", organizationId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateSettings(
    organizationId: string,
    patch: AppDatabase["public"]["Tables"]["organization_privacy_settings"]["Update"],
  ) {
    const { error } = await this.client
      .from("organization_privacy_settings")
      .update(patch)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
  }

  async listRequests(
    authUserId: string,
    organizationId: string,
    includeOrganizationRequests: boolean,
  ) {
    let query = this.client.from("privacy_deletion_requests").select("*");
    query = includeOrganizationRequests
      ? query.or(
          `requested_by_auth_user_id.eq.${authUserId},organization_id.eq.${organizationId}`,
        )
      : query.eq("requested_by_auth_user_id", authUserId);
    const { data, error } = await query.order("requested_at", {
      ascending: false,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  async getRequest(id: string) {
    const { data, error } = await this.client
      .from("privacy_deletion_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Deletion request not found.");
    return data;
  }

  async createRequest(
    row: AppDatabase["public"]["Tables"]["privacy_deletion_requests"]["Insert"],
  ) {
    const { data, error } = await this.client
      .from("privacy_deletion_requests")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async cancelRequest(id: string) {
    const { data, error } = await this.client
      .from("privacy_deletion_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "scheduled")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Deletion request cannot be cancelled.");
    return data;
  }
}
