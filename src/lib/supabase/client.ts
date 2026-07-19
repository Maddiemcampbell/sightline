import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export function createSupabaseClient(): SupabaseClient<AppDatabase> {
  const env = getPublicEnv();

  return createClient<AppDatabase>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
