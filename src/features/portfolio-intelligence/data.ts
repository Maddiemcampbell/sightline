import "server-only";

import {
  deriveRiskRelationships,
  findHistoricalRiskMatches,
} from "@/features/portfolio-intelligence/core";
import {
  assertAuthorized,
  canViewFinancialExposure,
  canViewRisk,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getRiskMemory(riskId: string) {
  const context = await requireActorContext();
  assertAuthorized(canViewRisk(context));
  const client = await createServerSupabaseClient();
  const [
    currentResult,
    risksResult,
    evidenceResult,
    projectsResult,
    resolutionsResult,
    vendorsResult,
  ] = await Promise.all([
    client
      .from("risks")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle(),
    client
      .from("risks")
      .select("*")
      .eq("organization_id", context.organizationId),
    client
      .from("risk_evidence")
      .select("risk_id,document_id")
      .eq("organization_id", context.organizationId),
    client
      .from("projects")
      .select("id,name,status")
      .eq("organization_id", context.organizationId),
    client
      .from("risk_resolutions")
      .select("*")
      .eq("organization_id", context.organizationId),
    client
      .from("vendors")
      .select("id,name")
      .eq("organization_id", context.organizationId),
  ]);
  for (const result of [
    currentResult,
    risksResult,
    evidenceResult,
    projectsResult,
    resolutionsResult,
    vendorsResult,
  ])
    if (result.error) throw new Error(result.error.message);
  const current = currentResult.data;
  if (!current)
    return {
      relationships: [],
      historicalMatches: [],
      canViewFinancials: false,
    };
  const risks = risksResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const riskById = new Map(risks.map((risk) => [risk.id, risk]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const vendorById = new Map(
    (vendorsResult.data ?? []).map((vendor) => [vendor.id, vendor]),
  );
  const relationships = deriveRiskRelationships(
    risks,
    evidenceResult.data ?? [],
  )
    .filter(
      (relationship) =>
        relationship.sourceRiskId === riskId ||
        relationship.targetRiskId === riskId,
    )
    .flatMap((relationship) => {
      const relatedRiskId =
        relationship.sourceRiskId === riskId
          ? relationship.targetRiskId
          : relationship.sourceRiskId;
      const risk = riskById.get(relatedRiskId);
      if (!risk) return [];
      return [
        {
          ...relationship,
          relatedRiskId,
          relatedRiskTitle: risk.title,
          relatedRiskStatus: risk.status,
          relatedProjectName: risk.project_id
            ? (projectById.get(risk.project_id)?.name ?? "Unknown project")
            : "No project",
          relatedVendorName: risk.vendor_id
            ? (vendorById.get(risk.vendor_id)?.name ?? null)
            : null,
        },
      ];
    })
    .toSorted((a, b) => b.confidence - a.confidence);
  const canViewFinancials = canViewFinancialExposure(context);
  const historicalMatches = findHistoricalRiskMatches({
    current,
    resolvedRisks: risks.filter((risk) => risk.status === "resolved"),
    resolutions: resolutionsResult.data ?? [],
    projects,
  }).map((match) =>
    canViewFinancials
      ? match
      : {
          ...match,
          estimatedExposureCents: 0,
          remainingExposureCents: 0,
          estimatedLossAvoidedCents: null,
        },
  );
  return { relationships, historicalMatches, canViewFinancials };
}
