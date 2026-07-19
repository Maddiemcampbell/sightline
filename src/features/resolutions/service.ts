import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createRiskResolutionSchema } from "@/domain/validation";
import { RiskActivityService } from "@/features/activity/service";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

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

  async record(
    context: ActorContext,
    input: {
      riskId: string;
      resolutionType:
        "mitigated" | "avoided" | "accepted" | "realized" | "unknown";
      summary: string;
      realizedImpactCents?: number | null;
    },
  ) {
    const risk = await this.requireRisk(context, input.riskId);
    const resolvedAt = new Date().toISOString();
    const value = createRiskResolutionSchema.parse({
      organizationId: context.organizationId,
      riskId: input.riskId,
      resolvedByUserId: context.userId,
      resolutionType: input.resolutionType,
      summary: input.summary,
      realizedImpactCents: input.realizedImpactCents ?? null,
      resolvedAt,
    });
    const { data: resolution, error: resolutionError } = await this.client
      .from("risk_resolutions")
      .insert({
        organization_id: value.organizationId,
        risk_id: value.riskId,
        resolved_by_user_id: value.resolvedByUserId,
        resolution_type: value.resolutionType,
        summary: value.summary,
        realized_impact_cents: value.realizedImpactCents,
        resolved_at: value.resolvedAt,
      })
      .select("*")
      .single();
    if (resolutionError || !resolution)
      throw new Error(resolutionError?.message ?? "Resolution was not stored.");
    const { error: riskError } = await this.client
      .from("risks")
      .update({ status: "resolved", resolved_at: resolvedAt })
      .eq("organization_id", context.organizationId)
      .eq("id", input.riskId);
    if (riskError) {
      await this.client
        .from("risk_resolutions")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("id", resolution.id);
      throw new Error(riskError.message);
    }
    try {
      await this.activities.append(context, {
        riskId: input.riskId,
        activityType: "risk_resolved",
        fromStatus: risk.status,
        toStatus: "resolved",
        summary: value.summary,
        metadata: {
          resolutionId: resolution.id,
          resolutionType: value.resolutionType,
          realizedImpactCents: value.realizedImpactCents,
        },
      });
    } catch (error) {
      await Promise.all([
        this.client
          .from("risks")
          .update({ status: risk.status, resolved_at: risk.resolved_at })
          .eq("organization_id", context.organizationId)
          .eq("id", input.riskId),
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

  private async requireRisk(context: ActorContext, riskId: string) {
    const { data, error } = await this.client
      .from("risks")
      .select("id,status,resolved_at")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk not found.");
    return data;
  }
}
