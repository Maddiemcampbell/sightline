import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { RecommendedActionService } from "@/features/actions/service";
import { buildMeetingAgenda } from "@/features/meetings/agenda";
import type { MeetingType } from "@/features/meetings/types";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { ForecastingView } from "@/features/forecasting/types";

export class MeetingService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async create(
    context: ActorContext,
    input: {
      title: string;
      meetingType: MeetingType;
      startsAt: string;
      projectIds: string[];
      forecast: ForecastingView;
    },
  ) {
    const accessible = new Set(
      input.forecast.projects.map((project) => project.id),
    );
    const projectIds = input.projectIds.length
      ? input.projectIds
      : [...accessible];
    if (!projectIds.length || projectIds.some((id) => !accessible.has(id)))
      throw new Error("Select projects you are authorized to review.");
    const agenda = buildMeetingAgenda({
      meetingType: input.meetingType,
      projectIds,
      forecast: input.forecast,
    });
    const { data, error } = await this.client
      .from("meetings")
      .insert({
        organization_id: context.organizationId,
        title: input.title,
        meeting_type: input.meetingType,
        starts_at: new Date(input.startsAt).toISOString(),
        project_ids: projectIds,
        agenda,
        facilitator_user_id: context.userId,
        created_by_user_id: context.userId,
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Meeting was not created.");
    return data;
  }

  async recordDecision(
    context: ActorContext,
    input: {
      meetingId: string;
      riskId: string | null;
      projectId: string | null;
      summary: string;
      rationale: string | null;
    },
  ) {
    const meeting = await this.requireMeeting(context, input.meetingId);
    if (input.projectId && !meeting.project_ids.includes(input.projectId))
      throw new Error("Project is outside this meeting scope.");
    if (input.riskId)
      await this.requireScopedRisk(context, input.riskId, meeting.project_ids);
    const { data, error } = await this.client
      .from("meeting_decisions")
      .insert({
        organization_id: context.organizationId,
        meeting_id: input.meetingId,
        project_id: input.projectId,
        risk_id: input.riskId,
        summary: input.summary,
        rationale: input.rationale,
        recorded_by_user_id: context.userId,
      })
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Decision was not recorded.");
    return data;
  }

  async createFollowUp(
    context: ActorContext,
    input: {
      meetingId: string;
      riskId: string;
      title: string;
      description: string;
      ownerUserId: string | null;
      priority: "low" | "normal" | "high" | "urgent";
      dueAt: string | null;
    },
  ) {
    const meeting = await this.requireMeeting(context, input.meetingId);
    await this.requireScopedRisk(context, input.riskId, meeting.project_ids);
    const action = await new RecommendedActionService(this.client).create(
      context,
      {
        riskId: input.riskId,
        ownerUserId: input.ownerUserId,
        detectionKey: null,
        title: input.title,
        description: input.description,
        actionType: "other",
        status: "accepted",
        priority: input.priority,
        dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null,
        completedAt: null,
        dismissedAt: null,
        dismissalReason: null,
        createdBy: context.userId,
        source: "human",
      },
    );
    const { error } = await this.client.from("meeting_follow_ups").insert({
      organization_id: context.organizationId,
      meeting_id: input.meetingId,
      action_id: action.id,
    });
    if (error) {
      await this.client
        .from("recommended_actions")
        .delete()
        .eq("organization_id", context.organizationId)
        .eq("id", action.id);
      throw new Error(error.message);
    }
    return action;
  }

  async complete(context: ActorContext, meetingId: string) {
    await this.requireMeeting(context, meetingId);
    const { data, error } = await this.client
      .from("meetings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("organization_id", context.organizationId)
      .eq("id", meetingId)
      .select("*")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Meeting was not completed.");
    return data;
  }

  private async requireMeeting(context: ActorContext, meetingId: string) {
    const { data, error } = await this.client
      .from("meetings")
      .select("id,status,project_ids")
      .eq("organization_id", context.organizationId)
      .eq("id", meetingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Meeting not found.");
    if (data.status === "completed")
      throw new Error("Completed meetings are read-only.");
    return data;
  }

  private async requireScopedRisk(
    context: ActorContext,
    riskId: string,
    projectIds: string[],
  ) {
    const { data, error } = await this.client
      .from("risks")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("id", riskId)
      .in("project_id", projectIds)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Risk is outside this meeting scope.");
  }
}
