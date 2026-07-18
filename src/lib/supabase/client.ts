import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";

export function createSupabaseClient(): SupabaseClient {
  const env = getPublicEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
