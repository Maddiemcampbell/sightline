import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class DataExportScheduleRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async get(organizationId: string) {
    const { data, error } = await this.client
      .from("organization_data_export_schedules")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async save(
    values: AppDatabase["public"]["Tables"]["organization_data_export_schedules"]["Insert"],
  ) {
    const { data, error } = await this.client
      .from("organization_data_export_schedules")
      .upsert(values, { onConflict: "organization_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async enabled() {
    const { data, error } = await this.client
      .from("organization_data_export_schedules")
      .select("*")
      .eq("enabled", true)
      .order("organization_id");
    if (error) throw new Error(error.message);
    return data;
  }
}
