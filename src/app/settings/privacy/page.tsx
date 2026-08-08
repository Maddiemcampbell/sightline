import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  cancelDeletionAction,
  requestAccountDeletionAction,
  requestOrganizationDeletionAction,
  updatePrivacySettingsAction,
} from "@/app/settings/privacy/actions";
import { PrivacyRepository } from "@/features/privacy/repository";
import { DataExportRepository } from "@/features/data-exports/repository";
import { PrivacyForm } from "@/features/privacy/privacy-forms";
import { RETENTION_DAY_OPTIONS } from "@/features/privacy/validation";
import {
  canExportOrganizationData,
  canManageOrganization,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage() {
  const context = await requireActorContext();
  const client = createAdminSupabaseClient();
  const repository = new PrivacyRepository(client);
  const mayViewExports = canExportOrganizationData(context);
  const [settings, requests, organization, exports] = await Promise.all([
    repository.getSettings(context.organizationId),
    repository.listRequests(
      context.authUserId,
      context.organizationId,
      context.organizationRole === "owner",
    ),
    client
      .from("organizations")
      .select("name,legal_hold_enabled")
      .eq("id", context.organizationId)
      .single(),
    mayViewExports
      ? new DataExportRepository(client).list(context.organizationId, 5)
      : Promise.resolve([]),
  ]);
  if (organization.error) throw new Error(organization.error.message);
  const pending = requests.filter((request) =>
    ["scheduled", "processing"].includes(request.status),
  );
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,var(--color-deep-green),#173d35)] text-white">
        <p className="text-xs font-semibold tracking-[0.14em] text-white/65 uppercase">
          Sightline Trust Center
        </p>
        <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.03em]">
          Your organization controls its data.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
          This page explains how Sightline handles customer information and
          gives authorized administrators direct access to retention, export,
          and deletion controls.
        </p>
      </Card>

      <section aria-labelledby="trust-commitments">
        <h2 id="trust-commitments" className="sr-only">
          Data commitments
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Commitment
            eyebrow="AI processing"
            statement="Customer data is never used to train foundation models without explicit permission."
            detail="AI responses are generated only from information the customer has authorized Sightline to process."
          />
          <Commitment
            eyebrow="Document ownership"
            statement="Customers retain ownership of their uploaded documents."
            detail="Documents remain private to the organization and downloads require server-side authorization."
          />
          <Commitment
            eyebrow="Organization control"
            statement={`${organization.data.name} controls member access, exports, retention, and deletion.`}
            detail="Organization Owners administer destructive operations. Administrators may create portable data exports."
          />
        </div>
      </section>

      <Card>
        <div>
          <p className="text-muted text-xs font-semibold uppercase">
            Data handling
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            How Sightline processes organization data
          </h2>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <PolicySummary
            title="Customer data use and document handling"
            items={[
              "Used to provide the Sightline features the organization selects",
              "Kept within organization and project access boundaries",
              "Uploaded documents remain customer-owned",
              "Private storage and server-authorized signed downloads",
              "Document binaries are excluded from metadata-only organization exports",
            ]}
          />
          <PolicySummary
            title="Configured data retention"
            items={[
              `Archived documents: ${settings.document_retention_days} days`,
              `Activity history: ${settings.activity_retention_days} days`,
              `AI conversations: ${settings.ai_retention_days} days`,
              `Audit evidence: ${settings.audit_retention_days} days`,
              `Deletion grace period: ${settings.soft_delete_grace_days} days`,
            ]}
          />
          <PolicySummary
            title="AI processing controls"
            items={[
              "Customer-authorized organization and project context only",
              "No foundation-model training without explicit permission",
              "Grounded answers preserve evidence references where available",
              "Provider credentials and internal model telemetry are not included in customer exports",
              `AI conversation retention: ${settings.ai_retention_days} days`,
            ]}
          />
        </div>
      </Card>

      {pending.length > 0 && (
        <Card className="border-danger/40 bg-danger/5">
          <h2 className="text-lg font-semibold">Deletion countdown active</h2>
          <ul className="mt-4 space-y-4">
            {pending.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-4"
              >
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

      {pending.length === 0 && (
        <Card>
          <p className="text-muted text-xs font-semibold uppercase">
            Organization deletion status
          </p>
          <h2 className="mt-2 text-lg font-semibold">No deletion scheduled</h2>
          <p className="text-muted mt-2 text-sm">
            {organization.data.name} is active and no organization or account
            deletion visible to you is pending.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              Organization export history
            </h2>
            <p className="text-muted mt-2 text-sm">
              Export packages contain customer-facing business data and a
              machine-readable manifest. Signed downloads expire automatically.
            </p>
          </div>
          {mayViewExports && (
            <Link
              href="/settings/data-export"
              className="text-deep-green text-sm font-semibold underline"
            >
              Manage exports
            </Link>
          )}
        </div>
        {!mayViewExports ? (
          <p className="text-muted mt-5 rounded-md border border-dashed p-4 text-sm">
            Export history is available to organization Owners and
            Administrators.
          </p>
        ) : exports.length === 0 ? (
          <p className="text-muted mt-5 rounded-md border border-dashed p-4 text-sm">
            No organization exports have been requested.
          </p>
        ) : (
          <ul className="divide-border mt-5 divide-y">
            {exports.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <strong>{item.export_format.toUpperCase()}</strong> requested
                  by {item.requested_by_name}
                </span>
                <span className="text-muted">
                  {item.status} · {new Date(item.requested_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canManageOrganization(context) && (
        <Card>
          <h2 className="text-xl font-semibold">Data retention</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Retention cleanup applies to archived documents, activity, deleted
            comments, and AI conversations. Active records are preserved except
            where explicitly described.
          </p>
          <PrivacyForm
            action={updatePrivacySettingsAction}
            submitLabel="Save retention policy"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <RetentionSelect
                name="softDeleteGraceDays"
                label="Deletion grace period"
                value={settings.soft_delete_grace_days}
                options={RETENTION_DAY_OPTIONS.softDeleteGraceDays}
              />
              <RetentionSelect
                name="documentRetentionDays"
                label="Archived documents"
                value={settings.document_retention_days}
                options={RETENTION_DAY_OPTIONS.documentRetentionDays}
              />
              <RetentionSelect
                name="activityRetentionDays"
                label="Activity history"
                value={settings.activity_retention_days}
                options={RETENTION_DAY_OPTIONS.activityRetentionDays}
              />
              <RetentionSelect
                name="aiRetentionDays"
                label="AI conversations"
                value={settings.ai_retention_days}
                options={RETENTION_DAY_OPTIONS.aiRetentionDays}
              />
              <RetentionSelect
                name="auditRetentionDays"
                label="Audit evidence policy (purge not yet automated)"
                value={settings.audit_retention_days}
                options={RETENTION_DAY_OPTIONS.auditRetentionDays}
              />
              <RetentionSelect
                name="deletedRecordRetentionDays"
                label="Deleted comment tombstones"
                value={settings.deleted_record_retention_days}
                options={RETENTION_DAY_OPTIONS.deletedRecordRetentionDays}
              />
            </div>
          </PrivacyForm>
        </Card>
      )}

      <Card>
        <p className="text-muted text-xs font-semibold uppercase">
          Data governance
        </p>
        <h2 className="mt-2 text-lg font-semibold">Legal hold</h2>
        <p className="text-muted mt-2 text-sm">
          {organization.data.legal_hold_enabled
            ? "A legal hold is active. Retention cleanup and permanent deletion are blocked."
            : "No legal hold is active. Legal hold activation and release will require a controlled support workflow."}
        </p>
      </Card>

      <div>
        <Card>
          <h2 className="text-lg font-semibold">Security practices</h2>
          <ul className="text-muted mt-4 space-y-3 text-sm">
            <li>
              <strong className="text-foreground">Access:</strong> verified
              sessions, organization membership, centralized authorization, and
              database RLS.
            </li>
            <li>
              <strong className="text-foreground">Files:</strong> private
              buckets, validated uploads, ownership checks, and short-lived
              signed downloads.
            </li>
            <li>
              <strong className="text-foreground">Account safety:</strong> use a
              unique password, review active sessions, and remove members who no
              longer require access.
            </li>
            <li>
              <strong className="text-foreground">Traceability:</strong>{" "}
              security-sensitive operations are recorded separately from the
              activity timeline.
            </li>
          </ul>
          <Link
            href="/settings/security"
            className="text-deep-green mt-5 inline-block text-sm font-semibold underline"
          >
            Review security settings
          </Link>
        </Card>
      </div>

      {context.organizationRole === "owner" &&
        pending.every(
          (item) => item.organization_id !== context.organizationId,
        ) && (
          <Card className="border-danger/30">
            <h2 className="text-xl font-semibold">Delete organization</h2>
            <p className="text-muted mt-2 mb-6 text-sm">
              Organization-only deletion revokes access and anonymizes the
              tenant while retaining quarantined business records. Full deletion
              also permanently removes projects, risks, actions, documents,
              evidence, activity, comments, AI conversations, notifications, and
              storage objects after the grace period.
            </p>
            <PrivacyForm
              action={requestOrganizationDeletionAction}
              submitLabel="Schedule organization deletion"
              destructive
            >
              <label className="block text-sm font-semibold">
                Deletion scope
                <select
                  name="scope"
                  className="border-border mt-2 min-h-11 w-full rounded-md border px-3"
                >
                  <option value="organization_only">
                    Organization access and profile only
                  </option>
                  <option value="organization_all_data">
                    Organization plus all related data
                  </option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Type {organization.data.name} to confirm
                <input
                  name="confirmation"
                  required
                  className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
                />
              </label>
            </PrivacyForm>
          </Card>
        )}

      {pending.every(
        (item) => item.target_auth_user_id !== context.authUserId,
      ) && (
        <Card className="border-danger/30">
          <h2 className="text-xl font-semibold">Delete your account</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Your identity will be anonymized, organization memberships removed,
            and Supabase Auth account permanently deleted after the grace
            period. You must transfer ownership anywhere you are the last Owner.
          </p>
          <PrivacyForm
            action={requestAccountDeletionAction}
            submitLabel="Schedule account deletion"
            destructive
          >
            <label className="block text-sm font-semibold">
              Type DELETE MY ACCOUNT to confirm
              <input
                name="confirmation"
                required
                className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              />
            </label>
          </PrivacyForm>
        </Card>
      )}
    </div>
  );
}

function RetentionSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: number;
  options: readonly number[];
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
      >
        {options.map((days) => (
          <option key={days} value={days}>
            {days} days
          </option>
        ))}
      </select>
    </label>
  );
}

function countdown(scheduledFor: string) {
  const days = Math.max(
    0,
    Math.ceil((Date.parse(scheduledFor) - Date.now()) / 86_400_000),
  );
  return `${days} day${days === 1 ? "" : "s"}`;
}

function scopeLabel(
  scope: "user_only" | "organization_only" | "organization_all_data",
) {
  if (scope === "user_only") return "Account deletion";
  if (scope === "organization_only") return "Organization deletion";
  return "Organization and all related data deletion";
}

function Commitment({
  eyebrow,
  statement,
  detail,
}: {
  eyebrow: string;
  statement: string;
  detail: string;
}) {
  return (
    <Card>
      <p className="text-muted text-xs font-semibold uppercase">{eyebrow}</p>
      <p className="mt-3 leading-6 font-semibold">{statement}</p>
      <p className="text-muted mt-2 text-sm leading-6">{detail}</p>
    </Card>
  );
}

function PolicySummary({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="border-border rounded-lg border p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="text-muted mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-deep-green">
              ●
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
