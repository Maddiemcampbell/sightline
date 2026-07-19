import "server-only";

import type { ActorContext } from "@/lib/auth/authorization";
import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/lib/auth/v1-identities";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function requireActorContext(): Promise<ActorContext> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("users")
    .select("id,organization_id,role")
    .eq("id", MATT_USER_ID)
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Authenticated application user not found.");
  return {
    organizationId: data.organization_id,
    userId: data.id,
    role: data.role,
  };
}
