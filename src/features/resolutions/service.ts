import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  reopenRiskSchema,
  resolveRiskSchema,
  type ResolveRiskInput,
} from "@/domain/resolutions";
import { RiskActivityService } from "@/features/activity/service";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Json } from "@/lib/supabase/database.types";

type RiskRow = AppDatabase["public"]["Tables"]["risks"]["Row"];

export class ResolutionTrackingService {
  private readonly activities: RiskActivityService;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.activities = new RiskActivityService(client);
  }

  async listForRisk(context: ActorContext, riskId: string) {
    await this.requireRisk(context, riskId);
    const { data, error } = await this.client
      .from("risk_resolutions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", riskId)
      .order("resolved_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async resolve(context: ActorContext, input: ResolveRiskInput) {
    const value = resolveRiskSchema.parse(input);
    const [risk, owner] = await Promise.all([
      this.requireRisk(context, value.riskId),
      this.requireUser(context, value.finalOwnerUserId),
    ]);
    if (risk.status === "resolved")
      throw new Error("Risk is already resolved.");
    if (risk.status === "dismissed")
      throw new Error("Dismissed risks cannot be resolved.");
    if (value.resolvedDate < risk.detected_at.slice(0, 10))
      throw new Error("Resolved date cannot precede risk detection.");
    if (value.resolvedDate > new Date().toISOString().slice(0, 10))
      throw new Error("Resolved date cannot be in the future.");
    await this.requireActions(context, value.riskId, value.completedActionIds);
    const resolvedAt = `${value.resolvedDate}T12:00:00.000Z`;
    const initialPrediction: Json = {
      title: risk.title,
      summary: risk.summary,
      category: risk.category,
      severity: risk.severity,
      status: risk.status,
      confidenceScore: risk.confidence_score,
      potentialExposureCents: risk.potential_exposure_cents,
      estimatedMarginImpactCents: risk.estimated_margin_impact_cents,
      whyItMatters: risk.why_it_matters,
      detectedAt: risk.detected_at,
      dueAt: risk.due_at,
      assignedUserId: risk.assigned_user_id,
    };
    const { data: resolution, error: resolutionError } = await this.client
      .from("risk_resolutions")
      .insert({
        organization_id: context.organizationId,
        risk_id: value.riskId,
        resolved_by_user_id: context.userId,
        final_owner_user_id: owner.id,
        resolution_type: value.resolutionType,
        summary: value.summary,
        resolved_date: value.resolvedDate,
        resolved_at: resolvedAt,
        completed_action_ids: value.completedActionIds,
        exposure_before_cents: value.exposureBeforeCents,
        remaining_exposure_cents: value.remainingExposureCents,
        estimated_loss_avoided_cents: value.estimatedLossAvoidedCents,
        warning_useful: value.warningUseful,
        prediction_accurate: value.predictionAccurate,
        internal_notes: value.internalNotes,
        initial_prediction: initialPrediction,
        realized_impact_cents: null,
      })
      .select("*")
      .single();
    if (resolutionError || !resolution)
      throw new Error(resolutionError?.message ?? "Resolution was not stored.");
    try {
      await this.updateRisk(context, value.riskId, {
        status: "resolved",
        resolved_at: resolvedAt,
        assigned_user_id: owner.id,
      });
      await this.activities.append(context, {
        riskId: value.riskId,
        activityType: "risk_resolved",
        fromStatus: risk.status,
        toStatus: "resolved",
        summary: `Risk resolved as ${value.resolutionType.replaceAll("_", " ")}: ${value.summary}`,
        metadata: {
          resolutionId: resolution.id,
          resolutionType: value.resolutionType,
          finalOwnerUserId: owner.id,
          resolvedDate: value.resolvedDate,
          completedActionIds: value.completedActionIds,
          estimatedExposureBeforeCents: value.exposureBeforeCents,
          estimatedRemainingExposureCents: value.remainingExposureCents,
          estimatedLossAvoidedCents: value.estimatedLossAvoidedCents,
          warningUseful: value.warningUseful,
          predictionAccurate: value.predictionAccurate,
          internalNotes: value.internalNotes,
        },
      });
    } catch (error) {
      await Promise.all([
        this.updateRisk(context, value.riskId, {
          status: risk.status,
          resolved_at: risk.resolved_at,
          assigned_user_id: risk.assigned_user_id,
        }),
        this.client
          .from("risk_resolutions")
          .delete()
          .eq("organization_id", context.organizationId)
          .eq("id", resolution.id),
      ]);
      throw error;
    }
    return resolution;
  }

  async reopen(
    context: ActorContext,
    input: { riskId: string; reason: string },
  ) {
    const value = reopenRiskSchema.parse(input);
    const risk = await this.requireRisk(context, value.riskId);
    if (risk.status !== "resolved")
      throw new Error("Only resolved risks can be reopened.");
    const { data: resolution, error } = await this.client
      .from("risk_resolutions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", value.riskId)
      .is("reopened_at", null)
      .order("resolved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resolution) throw new Error("Resolution record not found.");
    const reopenedAt = new Date().toISOString();
    const updatedResolution = await this.client
      .from("risk_resolutions")
      .update({ reopened_at: reopenedAt, reopen_reason: value.reason })
      .eq("organization_id", context.organizationId)
      .eq("id", resolution.id);
    if (updatedResolution.error)
      throw new Error(updatedResolution.error.message);
    try {
      await this.updateRisk(context, value.riskId, {
        status: "action_needed",
        resolved_at: null,
      });
      await this.activities.append(context, {
        riskId: value.riskId,
        activityType: "risk_reopened",
        fromStatus: "resolved",
        toStatus: "action_needed",
        summary: `Risk reopened: ${value.reason}`,
        metadata: { resolutionId: resolution.id, reason: value.reason },
      });
    } catch (caught) {
      await Promise.all([
        this.updateRisk(context, value.riskId, {
          status: risk.status,
          resolved_at: risk.resolved_at,
        }),
        this.client
          .from("risk_resolutions")
          .update({ reopened_at: null, reopen_reason: null })
          .eq("organization_id", context.organizationId)
          .eq("id", resolution.id),
      ]);
      throw caught;
    }
  }

  private async requireRisk(
    context: ActorContext,
    riskId: string,
  ): Promise<RiskRow> {
    const { data, error } = await this.client
      .from("risks")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk not found.");
    return data;
  }

  private async requireUser(context: ActorContext, userId: string) {
    const { data, error } = await this.client
      .from("users")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Final owner not found.");
    return data;
  }

  private async requireActions(
    context: ActorContext,
    riskId: string,
    actionIds: readonly string[],
  ) {
    if (!actionIds.length) return;
    const { data, error } = await this.client
      .from("recommended_actions")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", riskId)
      .in("id", [...actionIds]);
    if (error) throw new Error(error.message);
    if ((data ?? []).length !== actionIds.length)
      throw new Error("Completed action not found.");
  }

  private async updateRisk(
    context: ActorContext,
    riskId: string,
    patch: AppDatabase["public"]["Tables"]["risks"]["Update"],
  ) {
    const { data, error } = await this.client
      .from("risks")
      .update(patch)
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk not found.");
  }
}
