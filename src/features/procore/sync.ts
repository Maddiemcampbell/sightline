import "server-only";

import { ProcoreRepository } from "./repository";
import { createProcoreClient } from "./client";
import { ProcoreApiError } from "./types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function syncProcoreConnection(
  connectionId: string,
  organizationId: string,
) {
  const client = createAdminSupabaseClient();
  const repository = new ProcoreRepository(client);
  const connection = await repository.getConnection(organizationId);
  if (
    !connection ||
    connection.id !== connectionId ||
    connection.status === "disconnected"
  )
    return { skipped: true, projectsDiscovered: 0 };
  await repository.setStatus(connection.id, organizationId, {
    status: "pending",
    attempted: true,
    error: null,
  });
  try {
    const credentials = await repository.credentials(
      connection.id,
      organizationId,
    );
    const procore = createProcoreClient({
      environment: connection.environment,
      companyId: connection.company_id,
      ...credentials,
    });
    const projects = await procore.listProjects();
    await repository.upsertProjects(
      { id: connection.id, organizationId, companyId: connection.company_id },
      projects,
    );
    await client.from("integration_sync_cursors").upsert(
      {
        connection_id: connection.id,
        organization_id: organizationId,
        resource_type: "projects",
        last_attempted_at: new Date().toISOString(),
        last_completed_at: new Date().toISOString(),
        metadata: { recordsFetched: projects.length },
      },
      { onConflict: "connection_id,resource_type" },
    );
    await repository.setStatus(connection.id, organizationId, {
      status: "active",
      successful: true,
      error: null,
    });
    return { skipped: false, projectsDiscovered: projects.length };
  } catch (error) {
    const status =
      error instanceof ProcoreApiError
        ? error.code === "authentication"
          ? "authentication_error"
          : error.code === "permission"
            ? "permission_error"
            : error.code === "transient" || error.code === "rate_limit"
              ? "degraded"
              : "sync_error"
        : "sync_error";
    await repository.setStatus(connection.id, organizationId, {
      status,
      error:
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Procore synchronization failed.",
    });
    throw error;
  }
}

export async function syncQueuedProcoreJobs() {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("organization_job_runs")
    .select("organization_id,id,idempotency_key,max_attempts")
    .eq("job_type", "procore_sync")
    .eq("status", "queued")
    .order("created_at")
    .limit(25);
  if (error) throw new Error(error.message);
  return data ?? [];
}
