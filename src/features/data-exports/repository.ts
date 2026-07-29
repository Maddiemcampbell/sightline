import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class DataExportRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async list(organizationId: string, limit = 50) {
    const { data, error } = await this.client
      .from("organization_data_exports")
      .select("*")
      .eq("organization_id", organizationId)
      .order("requested_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 100));
    if (error) throw new Error(error.message);
    return data;
  }

  async get(organizationId: string, id: string) {
    const { data, error } = await this.client
      .from("organization_data_exports")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async countActive(organizationId: string) {
    const { count, error } = await this.client
      .from("organization_data_exports")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["queued", "processing"]);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async create(
    row: AppDatabase["public"]["Tables"]["organization_data_exports"]["Insert"],
  ) {
    const { data, error } = await this.client
      .from("organization_data_exports")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
