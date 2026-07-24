import { Card } from "@/components/ui/card";
import {
  cancelDeletionAction,
  requestAccountDeletionAction,
  requestOrganizationDeletionAction,
  updatePrivacySettingsAction,
} from "@/app/settings/privacy/actions";
import { PrivacyRepository } from "@/features/privacy/repository";
import { PrivacyForm } from "@/features/privacy/privacy-forms";
import {
  RETENTION_DAY_OPTIONS,
} from "@/features/privacy/validation";
import { canManageOrganization } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage() {
  const context = await requireActorContext();
  const client = createAdminSupabaseClient();
  const repository = new PrivacyRepository(client);
  const [settings, requests, organization] = await Promise.all([
    repository.getSettings(context.organizationId),
    repository.listRequests(
      context.authUserId,
      context.organizationId,
      context.organizationRole === "owner",
    ),
    client.from("organizations").select("name,legal_hold_enabled").eq("id", context.organizationId).single(),
  ]);
  if (organization.error) throw new Error(organization.error.message);
  const pending = requests.filter((request) =>
    ["scheduled", "processing"].includes(request.status),
  );
  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Card className="border-danger/40 bg-danger/5">
          <h2 className="text-lg font-semibold">Deletion countdown active</h2>
          <ul className="mt-4 space-y-4">
            {pending.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{scopeLabel(request.scope)}</p>
                  <p className="text-muted text-sm">
                    {request.status === "processing"
                      ? "Permanent cleanup is processing."
                      : `Permanent deletion in ${countdown(request.scheduled_for)} · ${new Date(request.scheduled_for).toLocaleString()}`}
                  </p>
                </div>
                {request.status === "scheduled" && (
                  <form action={cancelDeletionAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button className="border-border rounded-md border px-4 py-2 text-sm font-semibold">
                      Cancel deletion
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canManageOrganization(context) && (
        <Card>
          <h2 className="text-xl font-semibold">Data retention</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Retention cleanup applies to archived documents, activity, deleted
            comments, and AI conversations. Active records are preserved except
            where explicitly described.
          </p>
          <PrivacyForm action={updatePrivacySettingsAction} submitLabel="Save retention policy">
            <div className="grid gap-5 sm:grid-cols-2">
              <RetentionSelect name="softDeleteGraceDays" label="Deletion grace period" value={settings.soft_delete_grace_days} options={RETENTION_DAY_OPTIONS.softDeleteGraceDays} />
              <RetentionSelect name="documentRetentionDays" label="Archived documents" value={settings.document_retention_days} options={RETENTION_DAY_OPTIONS.documentRetentionDays} />
              <RetentionSelect name="activityRetentionDays" label="Activity history" value={settings.activity_retention_days} options={RETENTION_DAY_OPTIONS.activityRetentionDays} />
              <RetentionSelect name="aiRetentionDays" label="AI conversations" value={settings.ai_retention_days} options={RETENTION_DAY_OPTIONS.aiRetentionDays} />
              <RetentionSelect name="auditRetentionDays" label="Audit evidence" value={settings.audit_retention_days} options={RETENTION_DAY_OPTIONS.auditRetentionDays} />
              <RetentionSelect name="deletedRecordRetentionDays" label="Deleted comment tombstones" value={settings.deleted_record_retention_days} options={RETENTION_DAY_OPTIONS.deletedRecordRetentionDays} />
            </div>
          </PrivacyForm>
        </Card>
      )}

      <Card>
        <p className="text-muted text-xs font-semibold uppercase">Placeholder</p>
        <h2 className="mt-2 text-lg font-semibold">Legal hold</h2>
        <p className="text-muted mt-2 text-sm">
          {organization.data.legal_hold_enabled
            ? "A legal hold is active. Retention cleanup and permanent deletion are blocked."
            : "No legal hold is active. Legal hold activation and release will require a controlled support workflow."}
        </p>
      </Card>

      {context.organizationRole === "owner" && pending.every((item) => item.organization_id !== context.organizationId) && (
        <Card className="border-danger/30">
          <h2 className="text-xl font-semibold">Delete organization</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Organization-only deletion revokes access and anonymizes the tenant
            while retaining quarantined business records. Full deletion also
            permanently removes projects, risks, actions, documents, evidence,
            activity, comments, AI conversations, notifications, and storage
            objects after the grace period.
          </p>
          <PrivacyForm action={requestOrganizationDeletionAction} submitLabel="Schedule organization deletion" destructive>
            <label className="block text-sm font-semibold">
              Deletion scope
              <select name="scope" className="border-border mt-2 min-h-11 w-full rounded-md border px-3">
                <option value="organization_only">Organization access and profile only</option>
                <option value="organization_all_data">Organization plus all related data</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Type {organization.data.name} to confirm
              <input name="confirmation" required className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal" />
            </label>
          </PrivacyForm>
        </Card>
      )}

      {pending.every((item) => item.target_auth_user_id !== context.authUserId) && (
        <Card className="border-danger/30">
          <h2 className="text-xl font-semibold">Delete your account</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Your identity will be anonymized, organization memberships removed,
            and Supabase Auth account permanently deleted after the grace period.
            You must transfer ownership anywhere you are the last Owner.
          </p>
          <PrivacyForm action={requestAccountDeletionAction} submitLabel="Schedule account deletion" destructive>
            <label className="block text-sm font-semibold">
              Type DELETE MY ACCOUNT to confirm
              <input name="confirmation" required className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal" />
            </label>
          </PrivacyForm>
        </Card>
      )}
    </div>
  );
}

function RetentionSelect({ name, label, value, options }: { name: string; label: string; value: number; options: readonly number[] }) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select name={name} defaultValue={value} className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal">
        {options.map((days) => <option key={days} value={days}>{days} days</option>)}
      </select>
    </label>
  );
}

function countdown(scheduledFor: string) {
  const days = Math.max(0, Math.ceil((Date.parse(scheduledFor) - Date.now()) / 86_400_000));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function scopeLabel(scope: "user_only" | "organization_only" | "organization_all_data") {
  if (scope === "user_only") return "Account deletion";
  if (scope === "organization_only") return "Organization deletion";
  return "Organization and all related data deletion";
}
