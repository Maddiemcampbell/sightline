import "server-only";

import { NotificationRepository } from "@/features/notifications/repository";
import { reportError } from "@/features/observability/service";
import type { OrganizationJobType } from "@/features/background-jobs/types";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type AlertKind = "execution_failed" | "repeated_failures" | "long_running";
type AlertMessage = {
  id: string;
  organizationId: string;
  jobType: OrganizationJobType;
  kind: AlertKind;
  summary: string;
  runId: string | null;
};

export interface JobAlertChannel {
  readonly name: string;
  send(alert: AlertMessage): Promise<void>;
}

class InAppJobAlertChannel implements JobAlertChannel {
  readonly name = "in_app";
  async send(alert: AlertMessage) {
    const client = createAdminSupabaseClient();
    const { data, error } = await client
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", alert.organizationId)
      .in("role", ["owner", "administrator"]);
    if (error) throw new Error(error.message);
    const repository = new NotificationRepository(client);
    await Promise.all(
      (data ?? []).map(({ id }) =>
        repository.create({
          organizationId: alert.organizationId,
          recipientMembershipId: id,
          type: "background_job_failed",
          title: alert.summary,
          body: "Sightline platform operations has recorded this job health event.",
          href: "/settings/automation",
          payload: { runId: alert.runId },
        }),
      ),
    );
  }
}

const channels: readonly JobAlertChannel[] = [new InAppJobAlertChannel()];

export async function evaluateCompletedJobRun(runId: string): Promise<void> {
  const client = createAdminSupabaseClient();
  const { data: run, error } = await client
    .from("organization_job_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (error) throw new Error(error.message);
  const occurredAt = new Date().toISOString();
  if (run.status === "succeeded") {
    const { data: open } = await client
      .from("job_monitoring_alerts")
      .select("id")
      .eq("organization_id", run.organization_id)
      .eq("job_type", run.job_type)
      .eq("status", "open");
    for (const alert of open ?? []) {
      await client
        .from("job_monitoring_alerts")
        .update({ status: "recovered", recovered_at: occurredAt })
        .eq("id", alert.id);
      await client.from("job_monitoring_alert_events").insert({
        alert_id: alert.id,
        organization_id: run.organization_id,
        event_type: "recovered",
        occurred_at: occurredAt,
        details: {},
      });
    }
    return;
  }
  if (run.status !== "failed") return;
  const { data: recent, error: recentError } = await client
    .from("organization_job_runs")
    .select("status")
    .eq("organization_id", run.organization_id)
    .eq("job_type", run.job_type)
    .order("created_at", { ascending: false })
    .limit(10);
  if (recentError) throw new Error(recentError.message);
  const consecutive = consecutiveFailures(
    (recent ?? []).map((item) => item.status),
  );
  await openOrRepeat({
    organizationId: run.organization_id,
    jobType: run.job_type,
    runId: run.id,
    kind: "execution_failed",
    severity: "warning",
    summary: `${jobLabel(run.job_type)} failed`,
    details: { attemptCount: run.attempt_count },
    occurredAt,
  });
  if (consecutive >= 2)
    await openOrRepeat({
      organizationId: run.organization_id,
      jobType: run.job_type,
      runId: run.id,
      kind: "repeated_failures",
      severity: "critical",
      summary: `${jobLabel(run.job_type)} has failed repeatedly`,
      details: { consecutiveFailures: consecutive },
      occurredAt,
    });
}

export async function detectLongRunningJobs(now = new Date()): Promise<number> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client
    .from("organization_job_runs")
    .select("*")
    .eq("status", "running");
  if (error) throw new Error(error.message);
  let detected = 0;
  for (const run of data ?? []) {
    if (
      run.started_at &&
      now.getTime() - new Date(run.started_at).getTime() >
        expectedDurationMs(run.job_type)
    ) {
      detected += 1;
      await openOrRepeat({
        organizationId: run.organization_id,
        jobType: run.job_type,
        runId: run.id,
        kind: "long_running",
        severity: "critical",
        summary: `${jobLabel(run.job_type)} exceeded its expected duration`,
        details: { expectedDurationMs: expectedDurationMs(run.job_type) },
        occurredAt: now.toISOString(),
      });
    }
  }
  return detected;
}

export function consecutiveFailures(
  statuses: readonly ("queued" | "running" | "succeeded" | "failed")[],
): number {
  return statuses.findIndex((status) => status !== "failed") === -1
    ? statuses.length
    : statuses.findIndex((status) => status !== "failed");
}

export function expectedDurationMs(jobType: OrganizationJobType): number {
  return jobType === "portfolio_refresh" ? 15 * 60_000 : 10 * 60_000;
}

async function openOrRepeat(input: {
  organizationId: string;
  jobType: OrganizationJobType;
  runId: string;
  kind: AlertKind;
  severity: "warning" | "critical";
  summary: string;
  details: Record<string, unknown>;
  occurredAt: string;
}) {
  const client = createAdminSupabaseClient();
  const existing = await client
    .from("job_monitoring_alerts")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("job_type", input.jobType)
    .eq("alert_type", input.kind)
    .eq("status", "open")
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  let alert = existing.data;
  if (alert) {
    const updated = await client
      .from("job_monitoring_alerts")
      .update({
        occurrence_count: alert.occurrence_count + 1,
        last_detected_at: input.occurredAt,
        job_run_id: input.runId,
        details: input.details as Json,
      })
      .eq("id", alert.id)
      .select("*")
      .single();
    if (updated.error) throw new Error(updated.error.message);
    alert = updated.data;
  } else {
    const inserted = await client
      .from("job_monitoring_alerts")
      .insert({
        organization_id: input.organizationId,
        job_run_id: input.runId,
        job_type: input.jobType,
        alert_type: input.kind,
        severity: input.severity,
        summary: input.summary,
        details: input.details as Json,
        first_detected_at: input.occurredAt,
        last_detected_at: input.occurredAt,
      })
      .select("*")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    alert = inserted.data;
  }
  await client.from("job_monitoring_alert_events").insert({
    alert_id: alert.id,
    organization_id: input.organizationId,
    event_type: existing.data ? "repeated" : "opened",
    occurred_at: input.occurredAt,
    details: input.details as Json,
  });
  if (!existing.data) {
    for (const channel of channels) {
      try {
        await channel.send({
          id: alert.id,
          organizationId: input.organizationId,
          jobType: input.jobType,
          kind: input.kind,
          summary: input.summary,
          runId: input.runId,
        });
        await client.from("job_monitoring_alert_events").insert({
          alert_id: alert.id,
          organization_id: input.organizationId,
          event_type: "channel_dispatched",
          channel: channel.name,
          occurred_at: input.occurredAt,
          details: {},
        });
      } catch (error) {
        await client.from("job_monitoring_alert_events").insert({
          alert_id: alert.id,
          organization_id: input.organizationId,
          event_type: "channel_failed",
          channel: channel.name,
          occurred_at: input.occurredAt,
          details: {},
        });
        await reportError({
          error,
          source: "background_job",
          organizationId: input.organizationId,
          metadata: { channel: channel.name, alertType: input.kind },
        });
      }
    }
  }
}

function jobLabel(jobType: OrganizationJobType) {
  return jobType === "portfolio_refresh"
    ? "Portfolio Intelligence refresh"
    : "Daily Executive Brief";
}
