import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createRecommendedActionSchema,
  type CreateRecommendedActionInput,
} from "@/domain/validation";
import { RiskActivityService } from "@/features/activity/service";
import {
  RecommendedActionRepository,
  type ActionPatch,
} from "@/features/actions/repository";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { RecommendedActionRow } from "@/lib/supabase/database-row.types";

const terminalStatuses = new Set(["completed", "dismissed"]);

export class RecommendedActionService {
  private readonly repository: RecommendedActionRepository;
  private readonly activities: RiskActivityService;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.repository = new RecommendedActionRepository(client);
    this.activities = new RiskActivityService(client);
  }

  async accept(context: ActorContext, actionId: string) {
    const action = await this.repository.get(context, actionId);
    if (action.status !== "suggested")
      throw new Error("Only suggested actions can be accepted.");
    return this.change(
      context,
      action,
      { status: "accepted" },
      "Action accepted.",
      "accepted",
    );
  }

  async assignOwner(
    context: ActorContext,
    actionId: string,
    ownerUserId: string | null,
  ) {
    const action = await this.repository.get(context, actionId);
    this.requireOpen(action);
    if (
      ownerUserId &&
      !(await this.repository.userExists(context, ownerUserId))
    )
      throw new Error("Action owner not found.");
    return this.change(
      context,
      action,
      { owner_user_id: ownerUserId },
      ownerUserId ? "Action owner assigned." : "Action owner removed.",
      "owner",
    );
  }

  async changePriority(
    context: ActorContext,
    actionId: string,
    priority: RecommendedActionRow["priority"],
  ) {
    const action = await this.repository.get(context, actionId);
    this.requireOpen(action);
    return this.change(
      context,
      action,
      { priority },
      "Action priority changed.",
      "priority",
    );
  }

  async setDueDate(
    context: ActorContext,
    actionId: string,
    dueAt: string | null,
  ) {
    const action = await this.repository.get(context, actionId);
    this.requireOpen(action);
    return this.change(
      context,
      action,
      { due_at: dueAt },
      dueAt ? "Action due date changed." : "Action due date removed.",
      "due_date",
    );
  }

  async start(context: ActorContext, actionId: string) {
    const action = await this.repository.get(context, actionId);
    if (
      !(["accepted", "in_progress"] as const).includes(
        action.status as "accepted" | "in_progress",
      )
    )
      throw new Error("Accept the action before starting it.");
    if (action.status === "in_progress") return action;
    return this.change(
      context,
      action,
      { status: "in_progress" },
      "Action marked in progress.",
      "started",
    );
  }

  async complete(context: ActorContext, actionId: string) {
    const action = await this.repository.get(context, actionId);
    if (
      !(["accepted", "in_progress"] as const).includes(
        action.status as "accepted" | "in_progress",
      )
    )
      throw new Error("Only accepted or in-progress actions can be completed.");
    return this.change(
      context,
      action,
      { status: "completed", completed_at: new Date().toISOString() },
      "Action completed. Risk remains open pending explicit resolution.",
      "completed",
    );
  }

  async dismiss(context: ActorContext, actionId: string, reason: string) {
    const normalized = reason.trim();
    if (normalized.length < 3)
      throw new Error("A dismissal reason is required.");
    const action = await this.repository.get(context, actionId);
    this.requireOpen(action);
    return this.change(
      context,
      action,
      {
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
        dismissal_reason: normalized,
      },
      `Action dismissed: ${normalized}`,
      "dismissed",
    );
  }

  async create(
    context: ActorContext,
    input: Omit<CreateRecommendedActionInput, "organizationId">,
  ) {
    const value = createRecommendedActionSchema.parse({
      ...input,
      organizationId: context.organizationId,
    });
    if (value.createdBy !== context.userId)
      throw new Error("Action creator must match the current user.");
    if (
      value.ownerUserId &&
      !(await this.repository.userExists(context, value.ownerUserId))
    )
      throw new Error("Action owner not found.");
    const { data, error } = await this.client
      .from("recommended_actions")
      .insert({
        organization_id: context.organizationId,
        risk_id: value.riskId,
        owner_user_id: value.ownerUserId,
        detection_key: value.detectionKey,
        title: value.title,
        description: value.description,
        action_type: value.actionType,
        status: value.status,
        priority: value.priority,
        due_at: value.dueAt,
        completed_at: value.completedAt,
        dismissed_at: value.dismissedAt,
        dismissal_reason: value.dismissalReason,
        created_by_user_id: value.createdBy,
        source: value.source,
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Action was not created.");
    try {
      await this.activities.append(context, {
        riskId: value.riskId,
        activityType: "action_suggested",
        summary: `Action suggested: ${value.title}`,
        metadata: { actionId: data.id, change: "created" },
      });
    } catch (error) {
      await this.client
        .from("recommended_actions")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("id", data.id);
      throw error;
    }
    return data;
  }

  private requireOpen(action: RecommendedActionRow) {
    if (terminalStatuses.has(action.status))
      throw new Error("Completed or dismissed actions cannot be changed.");
  }

  private async change(
    context: ActorContext,
    before: RecommendedActionRow,
    patch: ActionPatch,
    note: string,
    change: string,
  ) {
    const after = await this.repository.update(context, before.id, patch);
    try {
      await this.activities.append(context, {
        riskId: before.risk_id,
        activityType:
          change === "accepted"
            ? "action_accepted"
            : change === "started"
              ? "action_started"
              : change === "completed"
                ? "action_completed"
                : change === "dismissed"
                  ? "action_dismissed"
                  : "risk_updated",
        summary: note,
        metadata: {
          actionId: before.id,
          change,
          before: {
            status: before.status,
            ownerUserId: before.owner_user_id,
            priority: before.priority,
            dueAt: before.due_at,
          },
          after: {
            status: after.status,
            ownerUserId: after.owner_user_id,
            priority: after.priority,
            dueAt: after.due_at,
          },
        },
      });
    } catch (error) {
      await this.repository.update(context, before.id, {
        status: before.status,
        owner_user_id: before.owner_user_id,
        priority: before.priority,
        due_at: before.due_at,
        completed_at: before.completed_at,
        dismissed_at: before.dismissed_at,
        dismissal_reason: before.dismissal_reason,
      });
      throw error;
    }
    return after;
  }
}
