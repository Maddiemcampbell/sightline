import "server-only";

import { getForecastingView } from "@/features/forecasting/data";
import type { AgendaItem, MeetingType } from "@/features/meetings/types";
import { meetingAgendaSchema } from "@/features/meetings/validation";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function getMeetingPreparationData() {
  const context = await requireActorContext();
  const client = createAdminSupabaseClient();
  const [forecast, usersResult, meetingsResult] = await Promise.all([
    getForecastingView(),
    client
      .from("users")
      .select("id,full_name")
      .eq("organization_id", context.organizationId)
      .order("full_name"),
    client
      .from("meetings")
      .select("*")
      .eq("organization_id", context.organizationId)
      .order("starts_at", { ascending: false })
      .limit(20),
  ]);
  if (usersResult.error) throw new Error(usersResult.error.message);
  if (meetingsResult.error) throw new Error(meetingsResult.error.message);
  const accessibleProjectIds = new Set(
    forecast.projects.map((project) => project.id),
  );
  const meetings = meetingsResult.data.filter((meeting) =>
    meeting.project_ids.some((id) => accessibleProjectIds.has(id)),
  );
  return {
    context,
    forecast,
    owners: usersResult.data.map((user) => ({
      id: user.id,
      name: user.full_name,
    })),
    meetings,
  };
}

export async function getMeetingWorkspace(meetingId: string) {
  const context = await requireActorContext();
  const client = createAdminSupabaseClient();
  const forecast = await getForecastingView();
  const accessible = new Set(forecast.projects.map((project) => project.id));
  const meetingResult = await client
    .from("meetings")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("id", meetingId)
    .maybeSingle();
  if (meetingResult.error) throw new Error(meetingResult.error.message);
  const meeting = meetingResult.data;
  if (!meeting || !meeting.project_ids.every((id) => accessible.has(id)))
    throw new Error("Meeting not found.");
  const [decisionsResult, linksResult, risksResult, usersResult] =
    await Promise.all([
      client
        .from("meeting_decisions")
        .select("*")
        .eq("organization_id", context.organizationId)
        .eq("meeting_id", meeting.id)
        .order("created_at"),
      client
        .from("meeting_follow_ups")
        .select("action_id")
        .eq("organization_id", context.organizationId)
        .eq("meeting_id", meeting.id),
      client
        .from("risks")
        .select("id,title,project_id")
        .eq("organization_id", context.organizationId)
        .in("project_id", meeting.project_ids)
        .not("status", "in", '("resolved","dismissed")')
        .order("title"),
      client
        .from("users")
        .select("id,full_name")
        .eq("organization_id", context.organizationId)
        .order("full_name"),
    ]);
  for (const result of [decisionsResult, linksResult, risksResult, usersResult])
    if (result.error) throw new Error(result.error.message);
  const actionIds = (linksResult.data ?? []).map((link) => link.action_id);
  const actionsResult = actionIds.length
    ? await client
        .from("recommended_actions")
        .select("*")
        .eq("organization_id", context.organizationId)
        .in("id", actionIds)
        .order("created_at")
    : { data: [], error: null };
  if (actionsResult.error) throw new Error(actionsResult.error.message);
  const projects = forecast.projects.filter((project) =>
    meeting.project_ids.includes(project.id),
  );
  return {
    context,
    meeting: {
      ...meeting,
      meeting_type: meeting.meeting_type as MeetingType,
      agenda: meetingAgendaSchema.parse(meeting.agenda) as AgendaItem[],
    },
    decisions: decisionsResult.data ?? [],
    actions: actionsResult.data,
    risks: risksResult.data ?? [],
    owners: (usersResult.data ?? []).map((user) => ({
      id: user.id,
      name: user.full_name,
    })),
    projects,
  };
}
