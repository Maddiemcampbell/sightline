import "server-only";

import { headers } from "next/headers";

import {
  auditRequestContext,
  AuditService,
  type AuditEvent,
  type AuditRequestContext,
} from "@/features/audit/core";
import { AuditLogRepository } from "@/features/audit/repository";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export {
  auditIdentifier,
  auditRequestContext,
  AuditService,
} from "@/features/audit/core";
export type {
  AuditAction,
  AuditEvent,
  AuditRequestContext,
} from "@/features/audit/core";

export async function currentAuditRequestContext(): Promise<AuditRequestContext> {
  return auditRequestContext(await headers());
}

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  const service = new AuditService(
    new AuditLogRepository(createAdminSupabaseClient()),
  );
  await service.record(event, await currentAuditRequestContext());
}

export async function recordAuditEvents(
  events: readonly AuditEvent[],
): Promise<void> {
  const service = new AuditService(
    new AuditLogRepository(createAdminSupabaseClient()),
  );
  const request = await currentAuditRequestContext();
  for (const event of events) await service.record(event, request);
}

export async function recordPrincipalAuditEvent(
  event: Omit<
    AuditEvent,
    "organizationId" | "actorAuthUserId" | "actorUserId"
  > & { actorAuthUserId: string },
): Promise<void> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("organization_memberships")
    .select("organization_id,application_user_id")
    .eq("auth_user_id", event.actorAuthUserId);
  if (error) throw new Error(error.message);
  const request = await currentAuditRequestContext();
  const service = new AuditService(new AuditLogRepository(client));
  const memberships = data ?? [];
  if (!memberships.length) {
    await service.record(
      {
        ...event,
        organizationId: null,
        actorUserId: null,
      },
      request,
    );
    return;
  }
  await Promise.all(
    memberships.map((membership) =>
      service.record(
        {
          ...event,
          organizationId: membership.organization_id,
          actorUserId: membership.application_user_id,
        },
        request,
      ),
    ),
  );
}
