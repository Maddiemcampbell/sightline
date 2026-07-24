import "server-only";

import type { ActorContext } from "@/lib/auth/authorization";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function requireActorContext(): Promise<ActorContext> {
  const membership = await requireCurrentMembership();
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("users")
    .select("id,organization_id,role")
    .eq("id", membership.applicationUserId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      "This authenticated account is not linked to a Sightline user.",
    );
  }
  return {
    authUserId: membership.authUserId,
    organizationId: data.organization_id,
    organizationRole: membership.role,
    userId: data.id,
    role: data.role,
  };
}
