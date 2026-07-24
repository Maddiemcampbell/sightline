import type { AuditLogRow } from "@/lib/supabase/database.types";

type AuditUser = Readonly<{
  full_name: string;
  email: string;
}>;

export function toAuditLogView(log: AuditLogRow, user?: AuditUser) {
  return {
    id: log.id,
    action: log.event_type,
    actionLabel: log.event_type.replaceAll(".", " "),
    actor: user?.full_name ?? user?.email ?? "System or former user",
    actorAuthUserId: log.actor_auth_user_id,
    actorUserId: log.actor_user_id,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    outcome: log.outcome,
    ipAddress: log.ip_address,
    correlationId: log.correlation_id,
    metadata: log.metadata,
    occurredAt: log.occurred_at,
  };
}
