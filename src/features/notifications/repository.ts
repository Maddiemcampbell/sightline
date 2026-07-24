import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type {
  NotificationType,
  NotificationView,
} from "@/features/notifications/types";
import type { Json } from "@/lib/supabase/database.types";

export class NotificationRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async list(organizationId: string, membershipId: string, limit = 20) {
    const { data, error } = await this.client
      .from("notifications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("recipient_membership_id", membershipId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data.map(
      (row): NotificationView => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        body: row.body,
        href: row.href,
        readAt: row.read_at,
        createdAt: row.created_at,
      }),
    );
  }

  async unreadCount(organizationId: string, membershipId: string) {
    const { count, error } = await this.client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("recipient_membership_id", membershipId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async create(input: {
    organizationId: string;
    recipientMembershipId: string;
    actorMembershipId?: string | null;
    type: NotificationType;
    title: string;
    body?: string;
    href?: string | null;
    payload?: Json;
  }) {
    const { error } = await this.client.from("notifications").insert({
      organization_id: input.organizationId,
      recipient_membership_id: input.recipientMembershipId,
      actor_membership_id: input.actorMembershipId ?? null,
      notification_type: input.type,
      title: input.title,
      body: input.body ?? "",
      href: input.href ?? null,
      payload: input.payload ?? {},
    });
    if (error) throw new Error(error.message);
  }

  async markRead(organizationId: string, membershipId: string, id: string) {
    const { error } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("recipient_membership_id", membershipId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async markAllRead(organizationId: string, membershipId: string) {
    const { error } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("recipient_membership_id", membershipId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
  }
}
