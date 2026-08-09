import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export async function createMicrosoftConsentUrl(input: {
  organizationId: string;
  userId: string;
}) {
  const env = getServerEnv();
  if (!env.MICROSOFT365_CLIENT_ID || !env.MICROSOFT365_CLIENT_SECRET) {
    throw new Error("Microsoft 365 is not configured on this server.");
  }
  const state = randomBytes(32).toString("base64url");
  const { error } = await createAdminSupabaseClient()
    .from("microsoft365_consent_states")
    .insert({
      organization_id: input.organizationId,
      requested_by_user_id: input.userId,
      state_hash: hashState(state),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
  if (error) throw new Error(error.message);
  const redirectUri = `${env.APP_URL}/api/integrations/microsoft365/callback`;
  const url = new URL(
    "https://login.microsoftonline.com/organizations/v2.0/adminconsent",
  );
  url.search = new URLSearchParams({
    client_id: env.MICROSOFT365_CLIENT_ID,
    scope: "https://graph.microsoft.com/.default",
    redirect_uri: redirectUri,
    state,
  }).toString();
  return url.toString();
}

export async function consumeMicrosoftConsentState(state: string) {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("microsoft365_consent_states")
    .select("*")
    .eq("state_hash", hashState(state))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const consumed = await client
    .from("microsoft365_consent_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consumed.error) throw new Error(consumed.error.message);
  return consumed.data ? data : null;
}
