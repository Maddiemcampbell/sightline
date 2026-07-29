import "server-only";

import {
  derivePortfolioObservations,
  deriveRiskRelationships,
} from "@/features/portfolio-intelligence/core";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { collectAllRows } from "@/lib/supabase/pagination";

export async function refreshPortfolioIntelligence(organizationId: string) {
  const client = createAdminSupabaseClient();
  const [projects, riskRows, actions, documents, vendors, evidence] =
    await Promise.all([
      client
        .from("projects")
        .select("id,name,status")
        .eq("organization_id", organizationId),
      collectAllRows((from, to) =>
        client
          .from("risks")
          .select("*", { count: "exact" })
          .eq("organization_id", organizationId)
          .order("id")
          .range(from, to),
      ),
      client
        .from("recommended_actions")
        .select("id,risk_id,title,status,due_at")
        .eq("organization_id", organizationId),
      client
        .from("documents")
        .select("id,project_id,archived_at")
        .eq("organization_id", organizationId),
      client
        .from("vendors")
        .select("id,name")
        .eq("organization_id", organizationId),
      client
        .from("risk_evidence")
        .select("risk_id,document_id")
        .eq("organization_id", organizationId),
    ]);
  for (const result of [projects, actions, documents, vendors, evidence]) {
    if (result.error) throw new Error(result.error.message);
  }

  const now = new Date();
  const observations = derivePortfolioObservations({
    projects: projects.data ?? [],
    risks: riskRows,
    actions: actions.data ?? [],
    documents: documents.data ?? [],
    vendors: vendors.data ?? [],
    now,
  });
  const relationships = deriveRiskRelationships(riskRows, evidence.data ?? []);

  const { error: supersedeError } = await client
    .from("portfolio_observations")
    .update({ status: "superseded" })
    .eq("organization_id", organizationId)
    .eq("status", "active");
  if (supersedeError) throw new Error(supersedeError.message);

  if (observations.length) {
    const { error } = await client.from("portfolio_observations").upsert(
      observations.map((observation) => ({
        organization_id: organizationId,
        observation_key: observation.key,
        observation_type: observation.type,
        title: observation.title,
        summary: observation.summary,
        supporting_evidence: observation.supportingEvidence as Json,
        confidence_score: observation.confidence,
        affected_project_ids: [...observation.affectedProjectIds],
        business_impact_estimate_cents: observation.businessImpactEstimateCents,
        business_impact_explanation: observation.businessImpactExplanation,
        recommended_next_step: observation.recommendedNextStep,
        algorithm_version: observation.algorithmVersion,
        status: "active" as const,
        last_observed_at: now.toISOString(),
      })),
      { onConflict: "organization_id,observation_key" },
    );
    if (error) throw new Error(error.message);
  }

  const { error: deleteError } = await client
    .from("risk_relationships")
    .delete()
    .eq("organization_id", organizationId)
    .eq("source", "deterministic");
  if (deleteError) throw new Error(deleteError.message);

  if (relationships.length) {
    const { error } = await client.from("risk_relationships").insert(
      relationships.map((relationship) => ({
        organization_id: organizationId,
        source_risk_id: relationship.sourceRiskId,
        target_risk_id: relationship.targetRiskId,
        relationship_type: relationship.type,
        confidence_score: relationship.confidence,
        supporting_evidence: relationship.supportingEvidence as Json,
        source: "deterministic" as const,
        algorithm_version: relationship.algorithmVersion,
      })),
    );
    if (error) throw new Error(error.message);
  }

  return {
    organizationId,
    observations: observations.length,
    relationships: relationships.length,
  };
}
