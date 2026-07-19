import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { RiskActivityService } from "@/features/activity/service";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

type RiskRow = AppDatabase["public"]["Tables"]["risks"]["Row"];

export class RiskManagementService {
  private readonly activities: RiskActivityService;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.activities = new RiskActivityService(client);
  }

  async acknowledge(context: ActorContext, riskId: string): Promise<void> {
    await this.requireRisk(context, riskId);
    await this.activities.append(context, {
      riskId,
      activityType: "commented",
      note: "Risk acknowledged from the Daily Brief.",
      metadata: { acknowledged: true, source: "daily_brief" },
    });
  }

  async dismiss(
    context: ActorContext,
    input: {
      riskId: string;
      reason: string;
      source: "daily_brief" | "risk_detail";
    },
  ): Promise<void> {
    const risk = await this.requireRisk(context, input.riskId);
    await this.updateRisk(context, input.riskId, {
      status: "dismissed",
      resolved_at: null,
    });
    try {
      await this.activities.append(context, {
        riskId: input.riskId,
        activityType: "dismissed",
        fromStatus: risk.status,
        toStatus: "dismissed",
        note: input.reason,
        metadata: { source: input.source },
      });
    } catch (error) {
      await this.updateRisk(context, input.riskId, {
        status: risk.status,
        resolved_at: risk.resolved_at,
      });
      throw error;
    }
  }

  async resolve(context: ActorContext, riskId: string): Promise<void> {
    const risk = await this.requireRisk(context, riskId);
    const resolvedAt = new Date().toISOString();
    await this.updateRisk(context, riskId, {
      status: "resolved",
      resolved_at: resolvedAt,
    });
    try {
      await this.activities.append(context, {
        riskId,
        activityType: "resolved",
        fromStatus: risk.status,
        toStatus: "resolved",
        note: "Risk marked resolved.",
        metadata: { source: "risk_detail" },
      });
    } catch (error) {
      await this.updateRisk(context, riskId, {
        status: risk.status,
        resolved_at: risk.resolved_at,
      });
      throw error;
    }
  }

  async assignOwner(
    context: ActorContext,
    riskId: string,
    userId: string | null,
  ): Promise<void> {
    const risk = await this.requireRisk(context, riskId);
    if (userId) await this.requireUser(context, userId);
    await this.updateRisk(context, riskId, { assigned_user_id: userId });
    try {
      await this.activities.append(context, {
        riskId,
        activityType: "assigned",
        fromStatus: risk.status,
        toStatus: risk.status,
        note: "Risk owner updated.",
        metadata: {
          source: "risk_detail",
          previousOwnerId: risk.assigned_user_id,
          ownerId: userId,
        },
      });
    } catch (error) {
      await this.updateRisk(context, riskId, {
        assigned_user_id: risk.assigned_user_id,
      });
      throw error;
    }
  }

  async setDueDate(
    context: ActorContext,
    riskId: string,
    dueAt: string | null,
  ): Promise<void> {
    const risk = await this.requireRisk(context, riskId);
    await this.updateRisk(context, riskId, { due_at: dueAt });
    try {
      await this.activities.append(context, {
        riskId,
        activityType: "commented",
        fromStatus: risk.status,
        toStatus: risk.status,
        note: "Risk due date updated.",
        metadata: {
          source: "risk_detail",
          previousDueAt: risk.due_at,
          dueAt,
        },
      });
    } catch (error) {
      await this.updateRisk(context, riskId, { due_at: risk.due_at });
      throw error;
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

  private async requireUser(
    context: ActorContext,
    userId: string,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("users")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Owner not found.");
  }

  private async updateRisk(
    context: ActorContext,
    riskId: string,
    patch: AppDatabase["public"]["Tables"]["risks"]["Update"],
  ): Promise<void> {
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
