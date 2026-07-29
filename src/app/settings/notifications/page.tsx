import { Card } from "@/components/ui/card";
import {
  updateNotificationSettingsAction,
  updateOrganizationNotificationDefaultsAction,
} from "@/app/settings/admin-actions";
import {
  CheckField,
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
  const [user, organization] = await Promise.all([
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
  ]);
  if (user.error || organization.error)
    throw new Error((user.error ?? organization.error)!.message);
  const defaults = asDefaults(organization.data.notification_defaults);
  return (
    <div className="space-y-6">
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
