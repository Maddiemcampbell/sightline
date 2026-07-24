import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Json } from "@/lib/supabase/database.types";

export class AuditLogRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async append(
    context: ActorContext,
    event: {
      actorAuthUserId: string | null;
      eventType: string;
      resourceType: string;
      resourceId?: string | null;
      outcome?: "success" | "denied" | "failed";
      metadata?: Json;
    },
  ): Promise<void> {
    const { error } = await this.client.from("audit_logs").insert({
      organization_id: context.organizationId,
      actor_auth_user_id: event.actorAuthUserId,
      actor_user_id: context.userId,
      event_type: event.eventType,
      resource_type: event.resourceType,
      resource_id: event.resourceId ?? null,
      outcome: event.outcome ?? "success",
      metadata: event.metadata ?? {},
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
      .limit(Math.min(Math.max(limit, 1), 250));
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
