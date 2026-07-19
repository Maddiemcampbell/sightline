import "server-only";

import { EvidenceRetrievalService } from "@/features/evidence/service";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getRiskEvidenceExperience(riskId: string) {
  const context = await requireActorContext();
  const service = new EvidenceRetrievalService(createAdminSupabaseClient());
  return service.getExperience(context, riskId);
}
