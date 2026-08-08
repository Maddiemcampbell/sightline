import { notFound } from "next/navigation";
import Link from "next/link";

import {
  addFeatureRequestNoteAction,
  updateFeatureRequestAction,
} from "@/app/internal/admin/feature-requests/actions";
import { FeatureRequestAdminRepository } from "@/features/feature-requests/repository";
import { FEATURE_REQUEST_STATUSES } from "@/features/feature-requests/types";
import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const operator = await requirePlatformPermission(
    "platform.support.read",
    "feature_request",
    requestId,
  );
  const detail = await new FeatureRequestAdminRepository(
    createAdminSupabaseClient(),
  ).get(requestId);
  if (!detail) notFound();
  await recordPlatformAuditEvent({
    operator,
    action: "platform.feature_request.viewed",
    resourceType: "feature_request",
    resourceId: requestId,
    organizationId: detail.request.organization_id,
  });
  const item = detail.request;
  return (
    <div className="space-y-6 p-6">
      <header>
        <Link
          href="/internal/admin/feature-requests"
          className="text-sm font-semibold text-slate-600 hover:underline"
        >
          ← Feature requests
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{item.id}</p>
            <h1 className="mt-1 text-2xl font-semibold">{item.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {detail.organization?.name ?? "Organization unavailable"} ·{" "}
              {detail.reportingUser?.full_name ??
                detail.reportingUser?.email ??
                "User unavailable"}{" "}
              · {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">
            {item.status.replaceAll("_", " ")}
          </span>
        </div>
      </header>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <TextSection title="Description" value={item.description} />
          <TextSection title="Problem this would solve" value={item.use_case} />
          <TextSection title="Desired outcome" value={item.desired_outcome} />
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Attachments</h2>
            {detail.attachments.length ? (
              <ul className="mt-3 space-y-2">
                {detail.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={`/api/internal/feature-requests/${item.id}/attachments/${attachment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-700 hover:underline"
                    >
                      {attachment.original_filename}
                    </a>
                    <span className="ml-2 text-xs text-slate-500">
                      {(attachment.size_bytes / 1024).toFixed(0)} KB
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No image attached.</p>
            )}
          </section>
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Internal notes</h2>
            <form
              action={addFeatureRequestNoteAction}
              className="mt-3 flex gap-2"
            >
              <input type="hidden" name="requestId" value={item.id} />
              <textarea
                name="body"
                required
                rows={2}
                className="min-w-0 flex-1 rounded-md border p-3"
                aria-label="New internal note"
              />
              <button className="self-end rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Add note
              </button>
            </form>
            <ul className="mt-4 space-y-3">
              {detail.notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-md bg-slate-50 p-3 text-sm"
                >
                  <p className="whitespace-pre-wrap">{note.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-5">
          <form
            action={updateFeatureRequestAction}
            className="space-y-4 rounded-lg border bg-white p-5"
          >
            <h2 className="font-semibold">Triage</h2>
            <input type="hidden" name="requestId" value={item.id} />
            <label className="block text-sm font-semibold">
              Status
              <select
                name="status"
                defaultValue={item.status}
                className="mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              >
                {FEATURE_REQUEST_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Assigned operator
              <select
                name="assignedOperatorId"
                defaultValue={item.assigned_operator_id ?? ""}
                className="mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              >
                <option value="">Unassigned</option>
                {detail.operators.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Related release
              <select
                name="relatedReleaseId"
                defaultValue={item.related_release_id ?? ""}
                className="mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              >
                <option value="">None</option>
                {detail.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.release_identifier}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              External issue reference
              <input
                name="externalIssueReference"
                defaultValue={item.external_issue_reference ?? ""}
                className="mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Resolution notes
              <textarea
                name="resolutionNotes"
                defaultValue={item.resolution_notes ?? ""}
                rows={4}
                className="mt-2 w-full rounded-md border p-3 font-normal"
              />
            </label>
            <button className="min-h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
              Save request
            </button>
          </form>
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Safe diagnostics</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Datum label="Priority" value={item.customer_priority} />
              <Datum label="Route" value={item.relevant_route} />
              <Datum label="Feature" value={item.relevant_feature} />
              <Datum label="Version" value={item.application_version} />
              <Datum label="Environment" value={item.environment} />
              {item.diagnostic_consent ? (
                <>
                  <Datum label="Browser / OS" value={item.browser_os} />
                  <Datum
                    label="Viewport"
                    value={
                      item.viewport_width && item.viewport_height
                        ? `${item.viewport_width} × ${item.viewport_height}`
                        : null
                    }
                  />
                </>
              ) : (
                <Datum
                  label="Extended diagnostics"
                  value="Consent not provided"
                />
              )}
            </dl>
          </section>
        </aside>
      </section>
    </div>
  );
}

function TextSection({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">
        {value || "Not provided."}
      </p>
    </section>
  );
}
function Datum({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 break-words">{value || "Not available"}</dd>
    </div>
  );
}
