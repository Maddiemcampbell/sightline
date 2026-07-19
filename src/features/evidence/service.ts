import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class EvidenceRetrievalService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async listForRisk(context: ActorContext, riskId: string) {
    const { data: risk, error: riskError } = await this.client
      .from("risks")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (riskError) throw new Error(riskError.message);
    if (!risk) throw new Error("Risk not found.");
    const { data, error } = await this.client
      .from("risk_evidence")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", riskId)
      .order("observed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
