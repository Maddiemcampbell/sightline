import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { SharePointDrive, SharePointSite } from "./types";

export class Microsoft365Repository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async connection(organizationId: string) {
    const { data, error } = await this.client
      .from("integration_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("provider", "sharepoint")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async saveConnection(input: {
    organizationId: string;
    tenantId: string;
    tenantName: string;
  }) {
    const { data, error } = await this.client
      .from("integration_connections")
      .upsert(
        {
          organization_id: input.organizationId,
          provider: "sharepoint",
          company_id: input.tenantId,
          company_name: input.tenantName,
          environment: "production",
          status: "active",
          installation_reference: input.tenantId,
          current_error: null,
        },
        { onConflict: "organization_id,provider" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async saveSiteDrives(input: {
    organizationId: string;
    connectionId: string;
    site: SharePointSite;
    drives: readonly SharePointDrive[];
  }) {
    for (const drive of input.drives) {
      const { data: source, error: sourceError } = await this.client
        .from("integration_sources")
        .upsert(
          {
            organization_id: input.organizationId,
            provider: "sharepoint",
            name: `SharePoint — ${input.site.displayName ?? input.site.name} / ${drive.name}`,
            external_account_id: drive.id,
            is_active: true,
          },
          { onConflict: "organization_id,provider,name" },
        )
        .select("id")
        .single();
      if (sourceError) throw new Error(sourceError.message);
      const { error } = await this.client
        .from("microsoft365_library_mappings")
        .upsert(
          {
            organization_id: input.organizationId,
            connection_id: input.connectionId,
            integration_source_id: source.id,
            site_id: input.site.id,
            site_name: input.site.displayName ?? input.site.name,
            site_url: input.site.webUrl,
            drive_id: drive.id,
            drive_name: drive.name,
          },
          { onConflict: "connection_id,drive_id" },
        );
      if (error) throw new Error(error.message);
    }
  }

  async mappings(organizationId: string, selected?: boolean) {
    let query = this.client
      .from("microsoft365_library_mappings")
      .select("*")
      .eq("organization_id", organizationId)
      .order("site_name")
      .order("drive_name");
    if (selected !== undefined) query = query.eq("selected", selected);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }
}
