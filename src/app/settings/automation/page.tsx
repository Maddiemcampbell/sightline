import { notFound } from "next/navigation";

import {
  AutomationScheduleForm,
  ManualJobControls,
} from "@/app/settings/automation/automation-controls";
import { Card } from "@/components/ui/card";
import { canManageOrganization } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AutomationSettingsPage() {
  const context = await requireActorContext();
  if (!canManageOrganization(context)) notFound();
  const client = createAdminSupabaseClient();
  const [scheduleResult, historyResult] = await Promise.all([
    client
      .from("organization_job_schedules")
      .select("*")
      .eq("organization_id", context.organizationId)
      .single(),
    client
      .from("organization_job_runs")
      .select("*")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (scheduleResult.error) throw new Error(scheduleResult.error.message);
  if (historyResult.error) throw new Error(historyResult.error.message);
  const schedule = scheduleResult.data;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Intelligence automation</h2>
        <p className="text-muted mt-2 mb-6 text-sm">
          Keep portfolio analysis and Daily Executive Briefs current without
          mixing data between organizations.
        </p>
        <AutomationScheduleForm
          schedule={{
            portfolioEnabled: schedule.portfolio_refresh_enabled,
            portfolioTime: schedule.portfolio_refresh_time,
            briefEnabled: schedule.daily_brief_enabled,
            briefTime: schedule.daily_brief_time,
            maxAttempts: schedule.max_attempts,
            timezone: schedule.timezone,
          }}
        />
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Manual execution</h2>
        <p className="text-muted mt-2 mb-5 text-sm">
          Manual runs use the same authorization, history, metrics, retry, and
          alerting path as scheduled work.
        </p>
        <ManualJobControls />
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Execution history</h2>
        <p className="text-muted mt-2 text-sm">
          The latest scheduled, manual, and retry attempts for this
          organization.
        </p>
        {historyResult.data.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-muted border-border border-b text-xs uppercase">
                <tr>
                  <th className="py-3 pr-4">Job</th>
                  <th className="py-3 pr-4">Started</th>
                  <th className="py-3 pr-4">Source</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Attempts</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {historyResult.data.map((run) => (
                  <tr key={run.id} className="border-border border-b align-top">
                    <td className="py-4 pr-4 font-semibold">
                      {run.job_type === "portfolio_refresh"
                        ? "Portfolio refresh"
                        : "Daily Executive Brief"}
                    </td>
                    <td className="py-4 pr-4">
                      {new Date(
                        run.started_at ?? run.created_at,
                      ).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4 capitalize">
                      {run.trigger_source}
                    </td>
                    <td className="py-4 pr-4 capitalize">{run.status}</td>
                    <td className="py-4 pr-4">
                      {run.attempt_count}/{run.max_attempts}
                    </td>
                    <td className="py-4 pr-4">
                      {run.duration_ms === null
                        ? "—"
                        : `${run.duration_ms.toLocaleString()} ms`}
                    </td>
                    <td className="py-4">
                      {run.error_message ?? metricSummary(run.metrics)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted mt-5 text-sm">
            No automation runs yet. Run a manual refresh or wait for the next
            scheduled time.
          </p>
        )}
      </Card>
    </div>
  );
}

function metricSummary(metrics: Json) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics))
    return "—";
  const entries = Object.entries(metrics)
    .filter(
      ([, value]) => typeof value === "string" || typeof value === "number",
    )
    .slice(0, 3);
  return entries.length
    ? entries.map(([key, value]) => `${humanize(key)}: ${value}`).join(" · ")
    : "—";
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
