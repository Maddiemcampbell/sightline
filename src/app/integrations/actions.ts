"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/features/audit/service";
import { canManageIntegrations } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ProcoreRepository } from "@/features/procore/repository";
import { createProcoreClient } from "@/features/procore/client";
import { ProcoreApiError } from "@/features/procore/types";

export type ProcoreActionState = { error?: string; success?: string };

export async function connectProcoreAction(
  _previous: ProcoreActionState,
  formData: FormData,
): Promise<ProcoreActionState> {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    return { error: "Manager access required." };
  const companyId = String(formData.get("companyId") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const environment = String(formData.get("environment") ?? "sandbox");
  const clientId = String(formData.get("clientId") ?? "").trim() || undefined;
  const clientSecret =
    String(formData.get("clientSecret") ?? "").trim() || undefined;
  if (
    !companyId ||
    !companyName ||
    !["sandbox", "production"].includes(environment)
  )
    return {
      error: "Enter a Procore company ID, company name, and environment.",
    };
  try {
    const procore = createProcoreClient({
      companyId,
      environment: environment as "sandbox" | "production",
      clientId,
      clientSecret,
    });
    await procore.listProjects();
    const env = getServerEnv();
    const repository = new ProcoreRepository(createAdminSupabaseClient());
    const connection = await repository.saveConnection({
      organizationId: context.organizationId,
      companyId,
      companyName,
      environment: environment as "sandbox" | "production",
      clientId: clientId ?? env.PROCORE_CLIENT_ID!,
      clientSecret: clientSecret ?? env.PROCORE_CLIENT_SECRET!,
    });
    await repository.setStatus(connection.id, context.organizationId, {
      status: "active",
      successful: true,
    });
    await enqueueProcoreSync(
      context.organizationId,
      context.userId,
      connection.id,
    );
    await recordAuditEvent({
      organizationId: context.organizationId,
      actorAuthUserId: context.authUserId,
      actorUserId: context.userId,
      action: "integration.procore_connected",
      resourceType: "integration_connection",
      resourceId: connection.id,
      metadata: { provider: "procore", environment, companyId },
    });
    revalidatePath("/integrations");
    return { success: "Procore is connected and ready to synchronize." };
  } catch (error) {
    const status =
      error instanceof ProcoreApiError
        ? error.code === "authentication"
          ? "authentication_error"
          : error.code === "permission"
            ? "permission_error"
            : "degraded"
        : "degraded";
    const existing = await new ProcoreRepository(createAdminSupabaseClient())
      .getConnection(context.organizationId)
      .catch(() => null);
    if (existing)
      await new ProcoreRepository(createAdminSupabaseClient())
        .setStatus(existing.id, context.organizationId, {
          status,
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Procore connection failed.",
        })
        .catch(() => undefined);
    return {
      error:
        error instanceof ProcoreApiError && error.code === "authentication"
          ? "Procore rejected the credentials. Verify the sandbox/production environment, Client ID, Client Secret, and that the app version is installed for the DMSA."
          : error instanceof ProcoreApiError && error.code === "permission"
            ? "Procore denied access. Confirm the DMSA is enabled for this company and has project and financial permissions."
            : error instanceof Error
              ? error.message
              : "Sightline could not connect to Procore.",
    };
  }
}

export async function disconnectProcoreAction() {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const repository = new ProcoreRepository(createAdminSupabaseClient());
  const connection = await repository.getConnection(context.organizationId);
  if (!connection) return;
  await repository.disconnect(connection.id, context.organizationId);
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "integration.procore_disconnected",
    resourceType: "integration_connection",
    resourceId: connection.id,
    metadata: { provider: "procore", companyId: connection.company_id },
  });
  revalidatePath("/integrations");
}

export async function syncProcoreAction() {
  const context = await requireActorContext();
  if (!canManageIntegrations(context))
    throw new Error("Manager access required.");
  const connection = await new ProcoreRepository(
    createAdminSupabaseClient(),
  ).getConnection(context.organizationId);
  if (!connection || connection.status === "disconnected")
    throw new Error("Connect Procore before requesting a synchronization.");
  await enqueueProcoreSync(
    context.organizationId,
    context.userId,
    connection.id,
  );
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "integration.procore_sync_requested",
    resourceType: "integration_connection",
    resourceId: connection.id,
    metadata: { provider: "procore" },
  });
  revalidatePath("/integrations");
}

async function enqueueProcoreSync(
  organizationId: string,
  userId: string,
  connectionId: string,
) {
  const client = createAdminSupabaseClient();
  const { data: membership, error: membershipError } = await client
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("application_user_id", userId)
    .single();
  if (membershipError) throw new Error(membershipError.message);
  const { error } = await client.from("organization_job_runs").upsert(
    {
      organization_id: organizationId,
      job_type: "procore_sync",
      trigger_source: "manual",
      idempotency_key: `procore:${connectionId}:${new Date().toISOString()}`,
      requested_by_membership_id: membership.id,
      max_attempts: 3,
    },
    { onConflict: "organization_id,job_type,idempotency_key" },
  );
  if (error) throw new Error(error.message);
}
