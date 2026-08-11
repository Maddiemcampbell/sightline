import { Card } from "@/components/ui/card";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  runExceptionCheckAction,
  updateExceptionRulesAction,
} from "@/app/settings/notifications/actions";
import {
  updateNotificationSettingsAction,
  updateOrganizationNotificationDefaultsAction,
} from "@/app/settings/admin-actions";
import {
  CheckField,
  Field,
  SelectField,
  SettingsForm,
} from "@/features/settings/settings-forms";
import { canManageOrganization } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function NotificationSettingsPage() {
  const context = await requireActorContext();
  const client = createAdminSupabaseClient();
  const [user, organization, rulesResult, alertsResult] = await Promise.all([
    client
      .from("users")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", context.userId)
      .single(),
    client
      .from("organizations")
      .select("notification_defaults")
      .eq("id", context.organizationId)
      .single(),
    client
      .from("exception_alert_rules")
      .select("*")
      .eq("organization_id", context.organizationId)
      .maybeSingle(),
    client
      .from("exception_alerts")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("status", "active")
      .order("severity", { ascending: true })
      .order("last_detected_at", { ascending: false })
      .limit(canManageOrganization(context) ? 100 : 0),
  ]);
  if (
    user.error ||
    organization.error ||
    rulesResult.error ||
    alertsResult.error
  )
    throw new Error(
      (user.error ??
        organization.error ??
        rulesResult.error ??
        alertsResult.error)!.message,
    );
  const defaults = asDefaults(organization.data.notification_defaults);
  const rules = rulesResult.data ?? defaultExceptionRules;
  return (
    <div className="space-y-6">
      {canManageOrganization(context) && (
        <Card data-testid="active-exceptions">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Active exceptions</h2>
              <p className="text-muted mt-2 text-sm">
                Only conditions outside your business thresholds appear here.
                Exceptions resolve automatically when the underlying data
                recovers.
              </p>
            </div>
            {canManageOrganization(context) && (
              <form action={runExceptionCheckAction}>
                <button className="border-border hover:bg-background min-h-10 rounded-md border px-4 text-sm font-semibold">
                  Check now
                </button>
              </form>
            )}
          </div>
          {alertsResult.data.length ? (
            <ul className="mt-5 grid gap-3">
              {alertsResult.data.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.href ?? "#"}
                    className="border-border hover:border-deep-green flex gap-3 rounded-md border p-4"
                  >
                    <AlertTriangle
                      aria-hidden="true"
                      className={
                        alert.severity === "critical"
                          ? "text-danger mt-0.5 size-5 shrink-0"
                          : "text-warning mt-0.5 size-5 shrink-0"
                      }
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {alert.title}
                      </span>
                      <span className="text-muted mt-1 block text-sm">
                        {alert.body}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-background mt-5 flex items-center gap-3 rounded-md p-4 text-sm">
              <CheckCircle2
                aria-hidden="true"
                className="text-deep-green size-5"
              />
              No active exceptions. Current inputs are within the configured
              thresholds.
            </div>
          )}
        </Card>
      )}
      <Card>
        <h2 className="text-xl font-semibold">Your notification preferences</h2>
        <p className="text-muted mt-2 mb-6 text-sm">
          Choose which in-app signals you receive. Email and push delivery are
          not enabled yet.
        </p>
        <SettingsForm action={updateNotificationSettingsAction}>
          <SelectField
            label="Digest preference"
            name="digestFrequency"
            defaultValue={user.data.digest_frequency}
            options={[
              ["off", "No digest"],
              ["daily", "Daily digest"],
              ["weekly", "Weekly digest"],
            ]}
          />
          <CheckField
            name="assignmentNotifications"
            label="Assignment notifications"
            description="Notify me when risks or actions are assigned to me."
            defaultChecked={user.data.assignment_notifications_enabled}
          />
          <CheckField
            name="mentionNotifications"
            label="Mention notifications"
            description="Notify me when a teammate mentions my username."
            defaultChecked={user.data.mention_notifications_enabled}
          />
          <CheckField
            name="weeklySummary"
            label="Weekly summaries"
            description="Include a weekly organization summary when delivery becomes available."
            defaultChecked={user.data.weekly_summary_enabled}
          />
        </SettingsForm>
      </Card>
      {canManageOrganization(context) && (
        <Card>
          <h2 className="text-xl font-semibold">
            Business exception thresholds
          </h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Alert leaders only when a condition requires attention. Checks run
            on a schedule and can also be run manually above.
          </p>
          <SettingsForm
            action={updateExceptionRulesAction}
            submitLabel="Save exception thresholds"
          >
            <div className="grid gap-5 xl:grid-cols-2">
              <RuleField
                name="marginEnabled"
                label="Margin below target"
                description="Alert when a project's forecast margin falls below your minimum."
                checked={rules.margin_enabled}
                threshold={
                  <Field
                    label="Minimum forecast margin (%)"
                    name="marginFloorPercent"
                    type="number"
                    defaultValue={String(rules.margin_floor_percent)}
                    required
                  />
                }
              />
              <RuleField
                name="budgetEnabled"
                label="Budget variance"
                description="Alert when forecast cost exceeds revised budget by this percentage."
                checked={rules.budget_enabled}
                threshold={
                  <Field
                    label="Maximum budget overrun (%)"
                    name="budgetVariancePercent"
                    type="number"
                    defaultValue={String(rules.budget_variance_percent)}
                    required
                  />
                }
              />
              <RuleField
                name="unownedRiskEnabled"
                label="Unowned high-severity risks"
                description="Alert whenever a high or critical active risk has no owner."
                checked={rules.unowned_risk_enabled}
              />
              <RuleField
                name="actionDueEnabled"
                label="Actions approaching due date"
                description="Alert before an open action becomes overdue."
                checked={rules.action_due_enabled}
                threshold={
                  <Field
                    label="Advance warning (days)"
                    name="actionDueDays"
                    type="number"
                    defaultValue={String(rules.action_due_days)}
                    required
                  />
                }
              />
              <RuleField
                name="documentExpiryEnabled"
                label="Required documents expiring"
                description="Alert before a document's recorded expiration date."
                checked={rules.document_expiry_enabled}
                threshold={
                  <Field
                    label="Advance warning (days)"
                    name="documentExpiryDays"
                    type="number"
                    defaultValue={String(rules.document_expiry_days)}
                    required
                  />
                }
              />
              <RuleField
                name="syncStaleEnabled"
                label="Integration data stopped syncing"
                description="Alert when a connected provider has not synchronized successfully."
                checked={rules.sync_stale_enabled}
                threshold={
                  <Field
                    label="Maximum time without sync (hours)"
                    name="syncStaleHours"
                    type="number"
                    defaultValue={String(rules.sync_stale_hours)}
                    required
                  />
                }
              />
              <RuleField
                name="forecastStaleEnabled"
                label="Forecast confidence reduced"
                description="Alert when financial inputs are missing or older than expected."
                checked={rules.forecast_stale_enabled}
                threshold={
                  <Field
                    label="Maximum input age (days)"
                    name="forecastStaleDays"
                    type="number"
                    defaultValue={String(rules.forecast_stale_days)}
                    required
                  />
                }
              />
            </div>
          </SettingsForm>
        </Card>
      )}
      {canManageOrganization(context) && (
        <Card>
          <h2 className="text-xl font-semibold">Organization defaults</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            New members inherit these defaults. Existing personal choices are
            not overwritten.
          </p>
          <SettingsForm action={updateOrganizationNotificationDefaultsAction}>
            <SelectField
              label="Default digest"
              name="digest"
              defaultValue={defaults.digest}
              options={[
                ["off", "No digest"],
                ["daily", "Daily"],
                ["weekly", "Weekly"],
              ]}
            />
            <CheckField
              name="assignment"
              label="Assignment notifications"
              description="Enable assignment notifications by default."
              defaultChecked={defaults.assignment}
            />
            <CheckField
              name="mention"
              label="Mention notifications"
              description="Enable mention notifications by default."
              defaultChecked={defaults.mention}
            />
            <CheckField
              name="weeklySummary"
              label="Weekly summary"
              description="Enable weekly summaries by default."
              defaultChecked={defaults.weeklySummary}
            />
          </SettingsForm>
        </Card>
      )}
    </div>
  );
}

function RuleField({
  name,
  label,
  description,
  checked,
  threshold,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  threshold?: React.ReactNode;
}) {
  return (
    <div className="border-border rounded-lg border p-4">
      <CheckField
        name={name}
        label={label}
        description={description}
        defaultChecked={checked}
      />
      {threshold && <div className="mt-4">{threshold}</div>}
    </div>
  );
}

const defaultExceptionRules = {
  margin_enabled: true,
  margin_floor_percent: 8,
  budget_enabled: true,
  budget_variance_percent: 5,
  unowned_risk_enabled: true,
  action_due_enabled: true,
  action_due_days: 3,
  document_expiry_enabled: true,
  document_expiry_days: 30,
  sync_stale_enabled: true,
  sync_stale_hours: 24,
  forecast_stale_enabled: true,
  forecast_stale_days: 14,
} as const;

function asDefaults(value: Json) {
  const row: Record<string, Json | undefined> =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, Json | undefined>)
      : {};
  return {
    digest:
      row.digest === "off" || row.digest === "weekly" ? row.digest : "daily",
    assignment: row.assignment !== false,
    mention: row.mention !== false,
    weeklySummary: row.weeklySummary !== false,
  } as const;
}
