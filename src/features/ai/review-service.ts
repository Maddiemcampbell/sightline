import "server-only";

import {
  riskAnalysisInputSchema,
  riskAnalysisOutputSchema,
  validateEvidenceGrounding,
} from "@/domain/ai/risk-analysis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function approveRiskSuggestion(input: {
  organizationId: string;
  suggestionId: string;
  reviewerUserId: string;
  reviewNote?: string;
}) {
  const client = await createServerSupabaseClient();
  const { data: reviewer } = await client
    .from("users")
    .select("id")
    .eq("id", input.reviewerUserId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (!reviewer)
    throw new Error("Reviewer is not authorized for this organization.");
  const { data: suggestion, error } = await client
    .from("ai_risk_suggestions")
    .select("*")
    .eq("id", input.suggestionId)
    .eq("organization_id", input.organizationId)
    .single();
  if (error || !suggestion) throw new Error("Suggestion not found.");
  if (suggestion.review_status !== "pending")
    throw new Error("Suggestion has already been reviewed.");
  const { data: run, error: runError } = await client
    .from("ai_analysis_runs")
    .select("input_snapshot")
    .eq("id", suggestion.analysis_run_id)
    .eq("organization_id", input.organizationId)
    .single();
  if (runError || !run)
    throw new Error("Analysis evidence snapshot not found.");
  const analysisInput = riskAnalysisInputSchema.parse(run.input_snapshot);
  const suggestedRisk = validateEvidenceGrounding(
    riskAnalysisOutputSchema.parse(suggestion.suggested_risk),
    analysisInput,
  );
  const detectionKey = `ai-suggestion:${suggestion.id}`;
  const { data: risk, error: riskError } = await client
    .from("risks")
    .insert({
      organization_id: input.organizationId,
      project_id: suggestion.project_id,
      assigned_user_id: input.reviewerUserId,
      detection_key: detectionKey,
      title: suggestedRisk.suggestedRiskTitle,
      summary: suggestedRisk.potentialImpactExplanation,
      category: suggestedRisk.category,
      severity: suggestedRisk.severity,
      status: "monitoring",
      potential_exposure_cents: 0,
      estimated_margin_impact_cents: 0,
      confidence_score: suggestedRisk.confidenceScore,
      why_it_matters: suggestedRisk.whyItMatters,
      detected_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (riskError || !risk)
    throw new Error(riskError?.message ?? "Risk was not created.");
  const evidenceById = new Map(
    [
      ...analysisInput.documentExcerpts,
      ...analysisInput.existingRiskEvidence,
    ].map((evidence) => [evidence.id, evidence]),
  );
  const evidenceRows = suggestedRisk.evidenceReferencesUsed.map((id) => {
    const evidence = evidenceById.get(id);
    if (!evidence) throw new Error(`Evidence ${id} is unavailable.`);
    return {
      organization_id: input.organizationId,
      risk_id: risk.id,
      document_id: evidence.documentId,
      detection_key: `${detectionKey}:evidence:${id}`,
      evidence_type: evidence.documentId ? "document_excerpt" : "manual_note",
      title: evidence.label,
      why_it_matters: `This evidence was explicitly cited by reviewed AI suggestion ${suggestion.id}.`,
      excerpt: evidence.excerpt,
      source_label: evidence.label,
      source_location: null,
      relevance_score: suggestedRisk.confidenceScore,
      support_type: "direct",
      occurred_at: evidence.observedAt,
    };
  });
  const [evidenceResult, actionResult, activityResult] = await Promise.all([
    client.from("risk_evidence").insert(evidenceRows),
    client.from("recommended_actions").insert({
      organization_id: input.organizationId,
      risk_id: risk.id,
      owner_user_id: input.reviewerUserId,
      detection_key: `${detectionKey}:action`,
      title: "Review and mitigate suggested risk",
      description: suggestedRisk.recommendedNextAction,
      action_type: "add_mitigation",
      status: "suggested",
      priority: "normal",
      created_by_user_id: input.reviewerUserId,
      source: "ai_suggestion",
    }),
    client.from("risk_activities").insert([
      {
        organization_id: input.organizationId,
        risk_id: risk.id,
        actor_user_id: input.reviewerUserId,
        actor_type: "user",
        activity_type: "risk_detected",
        to_status: "monitoring",
        summary: "AI suggestion approved by a human reviewer.",
        mentioned_user_ids: [],
        metadata: { aiSuggestionId: suggestion.id },
      },
      {
        organization_id: input.organizationId,
        risk_id: risk.id,
        actor_user_id: null,
        actor_type: "ai",
        activity_type: "system_analysis_completed",
        summary:
          "AI risk analysis completed and was retained for human review.",
        mentioned_user_ids: [],
        metadata: {
          aiSuggestionId: suggestion.id,
          analysisRunId: suggestion.analysis_run_id,
        },
      },
    ]),
  ]);
  const childError =
    evidenceResult.error ?? actionResult.error ?? activityResult.error;
  if (childError) throw new Error(childError.message);
  const { error: reviewError } = await client
    .from("ai_risk_suggestions")
    .update({
      review_status: "approved",
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_at: new Date().toISOString(),
      review_note: input.reviewNote?.trim() || null,
      activated_risk_id: risk.id,
    })
    .eq("id", suggestion.id)
    .eq("organization_id", input.organizationId)
    .eq("review_status", "pending");
  if (reviewError) throw new Error(reviewError.message);
  return risk.id;
}

export async function rejectRiskSuggestion(input: {
  organizationId: string;
  suggestionId: string;
  reviewerUserId: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (reason.length < 3) throw new Error("A rejection reason is required.");
  const client = await createServerSupabaseClient();
  const { data: reviewer } = await client
    .from("users")
    .select("id")
    .eq("id", input.reviewerUserId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (!reviewer)
    throw new Error("Reviewer is not authorized for this organization.");
  const { data, error } = await client
    .from("ai_risk_suggestions")
    .update({
      review_status: "rejected",
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_at: new Date().toISOString(),
      review_note: reason,
    })
    .eq("id", input.suggestionId)
    .eq("organization_id", input.organizationId)
    .eq("review_status", "pending")
    .select("id")
    .maybeSingle();
  if (error || !data)
    throw new Error(error?.message ?? "Pending suggestion not found.");
}
