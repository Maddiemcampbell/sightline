import "server-only";

import { EvidenceRetrievalService } from "@/features/evidence/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getRiskEvidenceExperience(riskId: string) {
  const context = await requireActorContext();
  const service = new EvidenceRetrievalService(
    await createServerSupabaseClient(),
  );
  return service.getExperience(context, riskId);
}
