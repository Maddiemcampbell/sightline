import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";
import { decryptProcoreSecret, encryptProcoreSecret } from "./crypto";
import type { ProcoreEnvironment, ProcoreProject } from "./types";

export class ProcoreRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async getConnection(organizationId: string) {
    const { data, error } = await this.client
      .from("integration_connections")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("provider", "procore")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  async saveConnection(input: {
    organizationId: string;
    companyId: string;
    companyName: string;
    environment: ProcoreEnvironment;
    clientId: string;
    clientSecret: string;
  }) {
    const { data: connection, error } = await this.client
      .from("integration_connections")
      .upsert(
        {
          organization_id: input.organizationId,
          provider: "procore",
          company_id: input.companyId,
          company_name: input.companyName,
          environment: input.environment,
          status: "pending",
          current_error: null,
        },
        { onConflict: "organization_id,provider" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const { error: credentialError } = await this.client
      .from("integration_credentials")
      .upsert(
        {
          connection_id: connection.id,
          organization_id: input.organizationId,
          credential_type: "procore_dmsa_client_credentials",
          encrypted_client_id: encryptProcoreSecret(input.clientId),
          encrypted_client_secret: encryptProcoreSecret(input.clientSecret),
          encryption_key_version: "v1",
          rotated_at: new Date().toISOString(),
        },
        { onConflict: "connection_id" },
      );
    if (credentialError) throw new Error(credentialError.message);
    const { error: sourceError } = await this.client
      .from("integration_sources")
      .upsert(
        {
          organization_id: input.organizationId,
          provider: "procore",
          name: `Procore — ${input.companyName}`,
          external_account_id: input.companyId,
          is_active: true,
        },
        { onConflict: "organization_id,provider,name" },
      );
    if (sourceError) throw new Error(sourceError.message);
    return connection;
  }

  async credentials(connectionId: string, organizationId: string) {
    const { data, error } = await this.client
      .from("integration_credentials")
      .select("encrypted_client_id,encrypted_client_secret")
      .eq("connection_id", connectionId)
      .eq("organization_id", organizationId)
      .single();
    if (error) throw new Error(error.message);
    return {
      clientId: decryptProcoreSecret(data.encrypted_client_id),
      clientSecret: decryptProcoreSecret(data.encrypted_client_secret),
    };
  }

  async setStatus(
    connectionId: string,
    organizationId: string,
    input: {
      status:
        | "pending"
        | "active"
        | "degraded"
        | "permission_error"
        | "authentication_error"
        | "sync_error"
        | "disconnected";
      error?: string | null;
      attempted?: boolean;
      successful?: boolean;
    },
  ) {
    const now = new Date().toISOString();
    const { error } = await this.client
      .from("integration_connections")
      .update({
        status: input.status,
        current_error: input.error ?? null,
        ...(input.attempted ? { last_attempted_sync_at: now } : {}),
        ...(input.successful ? { last_successful_sync_at: now } : {}),
      })
      .eq("id", connectionId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    await this.client
      .from("integration_sources")
      .update({ is_active: false })
      .eq("organization_id", organizationId)
      .eq("provider", "procore");
  }

  async disconnect(connectionId: string, organizationId: string) {
    await this.setStatus(connectionId, organizationId, {
      status: "disconnected",
      error: null,
    });
    const { error } = await this.client
      .from("integration_credentials")
      .delete()
      .eq("connection_id", connectionId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
  }

  async upsertProjects(
    connection: { id: string; organizationId: string; companyId: string },
    projects: readonly ProcoreProject[],
  ) {
    if (!projects.length) return;
    const rows = projects.map((project) => ({
      organization_id: connection.organizationId,
      connection_id: connection.id,
      procore_company_id: connection.companyId,
      procore_project_id: String(project.id),
      procore_project_name: project.name,
      procore_project_number: project.project_number ?? null,
      mapping_status: "suggested" as const,
      mapping_method: "manual" as const,
      last_discovered_at: new Date().toISOString(),
    }));
    const { error } = await this.client
      .from("integration_project_mappings")
      .upsert(rows, { onConflict: "connection_id,procore_project_id" });
    if (error) throw new Error(error.message);
  }

  async mappings(organizationId: string) {
    const { data, error } = await this.client
      .from("integration_project_mappings")
      .select("*")
      .eq("organization_id", organizationId)
      .order("procore_project_name");
    if (error) throw new Error(error.message);
    return data;
  }
}
