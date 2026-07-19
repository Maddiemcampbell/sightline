import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class EvidenceRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async requireRisk(context: ActorContext, riskId: string) {
    const { data, error } = await this.client
      .from("risks")
      .select("id,title,severity,confidence_score,why_it_matters")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk not found.");
    return data;
  }

  async listForRisk(context: ActorContext, riskId: string) {
    await this.requireRisk(context, riskId);
    const { data, error } = await this.client
      .from("risk_evidence")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", riskId)
      .order("relevance_score", { ascending: false })
      .order("occurred_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listDocuments(context: ActorContext, documentIds: readonly string[]) {
    if (!documentIds.length) return [];
    const { data, error } = await this.client
      .from("documents")
      .select("id,name,document_type,archived_at,storage_path")
      .eq("organization_id", context.organizationId)
      .in("id", [...documentIds]);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
