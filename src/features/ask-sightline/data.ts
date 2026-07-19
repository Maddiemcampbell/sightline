import "server-only";

import { AskSightlineService } from "@/features/ask-sightline/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getAskSightlineHistory(riskId: string) {
  const context = await requireActorContext();
  const result = await new AskSightlineService(
    createAdminSupabaseClient(),
  ).history(context, riskId);
  return result.messages;
}
