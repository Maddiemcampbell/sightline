import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createRecommendedActionSchema,
  type CreateRecommendedActionInput,
} from "@/domain/validation";
import { RiskActivityService } from "@/features/activity/service";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class RecommendedActionService {
  private readonly activities: RiskActivityService;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.activities = new RiskActivityService(client);
  }

  async listForRisk(context: ActorContext, riskId: string) {
    await this.requireRisk(context, riskId);
    const { data, error } = await this.client
      .from("recommended_actions")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("risk_id", riskId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(
    context: ActorContext,
    input: Omit<CreateRecommendedActionInput, "organizationId">,
  ) {
    await this.requireRisk(context, String(input.riskId));
    if (input.assignedUserId)
      await this.requireUser(context, input.assignedUserId);
    const value = createRecommendedActionSchema.parse({
      ...input,
      organizationId: context.organizationId,
    });
    const { data, error } = await this.client
      .from("recommended_actions")
      .insert({
        organization_id: context.organizationId,
        risk_id: value.riskId,
        assigned_user_id: value.assignedUserId,
        detection_key: value.detectionKey,
        title: value.title,
        description: value.description,
        status: value.status,
        priority: value.priority,
        due_at: value.dueAt,
        completed_at: value.completedAt,
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Action was not created.");
    try {
      await this.activities.append(context, {
        riskId: value.riskId,
        activityType: "action_updated",
        note: "Recommended action created.",
        metadata: { actionId: data.id, priority: value.priority },
      });
    } catch (activityError) {
      await this.client
        .from("recommended_actions")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("id", data.id);
      throw activityError;
    }
    return data;
  }

  private async requireRisk(context: ActorContext, riskId: string) {
    const { data, error } = await this.client
      .from("risks")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk not found.");
  }

  private async requireUser(context: ActorContext, userId: string) {
    const { data, error } = await this.client
      .from("users")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Action owner not found.");
  }
}
