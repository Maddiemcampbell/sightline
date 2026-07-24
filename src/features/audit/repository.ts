import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { AuditInsert, AuditWriter } from "@/features/audit/core";

export type { AuditWriter } from "@/features/audit/core";

export class AuditLogRepository implements AuditWriter {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async append(event: AuditInsert): Promise<void> {
    const { error } = await this.client.from("audit_logs").insert({
      organization_id: event.organizationId,
      actor_auth_user_id: event.actorAuthUserId,
      actor_user_id: event.actorUserId,
      event_type: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      outcome: event.outcome,
      metadata: event.metadata,
      ip_address: event.ipAddress,
      correlation_id: event.correlationId,
    });
    if (error) throw new Error(error.message);
  }

  async list(
    context: ActorContext,
    limit = 100,
  ): Promise<AppDatabase["public"]["Tables"]["audit_logs"]["Row"][]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("organization_id", context.organizationId)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 250));
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
