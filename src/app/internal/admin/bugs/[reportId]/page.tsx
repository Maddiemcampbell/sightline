import { notFound } from "next/navigation";
import Link from "next/link";

import {
  addBugReportNoteAction,
  updateBugReportAction,
} from "@/app/internal/admin/bugs/actions";
import { BugReportAdminRepository } from "@/features/bug-reports/admin-repository";
import { BUG_STATUSES } from "@/features/bug-reports/types";
import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function BugReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const operator = await requirePlatformPermission(
    "platform.support.read",
    "bug_report",
    reportId,
  );
  const client = createAdminSupabaseClient();
  const detail = await new BugReportAdminRepository(client).get(reportId);
  if (!detail) notFound();
  const { data: reportingUser } = await client
    .from("users")
    .select("email,full_name")
    .eq("id", detail.report.reporting_user_id)
    .maybeSingle();
  await recordPlatformAuditEvent({
    operator,
    action: "platform.bug_report.viewed",
    resourceType: "bug_report",
    resourceId: reportId,
    organizationId: detail.report.organization_id,
  });
  const report = detail.report;
  return (
    <div className="space-y-6 p-6">
      <header>
        <Link href="/internal/admin/bugs" className="text-sm font-semibold text-slate-600 hover:underline">
          ← Bug reports
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-slate-500">{report.id}</p>
            <h1 className="mt-1 text-2xl font-semibold">{report.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {detail.organization?.name ?? "Organization unavailable"} · {reportingUser?.full_name ?? reportingUser?.email ?? "User unavailable"} ·{" "}
              {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">
            {report.status.replaceAll("_", " ")}
          </span>
        </div>
      </header>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <ReportText title="Description" body={report.description} />
          <ReportText title="Steps to reproduce" body={report.steps_to_reproduce} />
          <div className="grid gap-5 sm:grid-cols-2">
            <ReportText title="Expected behavior" body={report.expected_behavior} />
            <ReportText title="Actual behavior" body={report.actual_behavior} />
          </div>
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Attachments</h2>
            {detail.attachments.length ? (
              <ul className="mt-3 space-y-2">
                {detail.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={`/api/internal/bug-reports/${report.id}/attachments/${attachment.id}`}
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
            ) : <p className="mt-2 text-sm text-slate-500">No image attached.</p>}
          </section>
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Internal notes</h2>
            <form action={addBugReportNoteAction} className="mt-3 flex gap-2">
              <input type="hidden" name="reportId" value={report.id} />
              <textarea name="body" required rows={2} className="min-w-0 flex-1 rounded-md border p-3" aria-label="New internal note" />
              <button className="self-end rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Add note</button>
            </form>
            <ul className="mt-4 space-y-3">
              {detail.notes.map((note) => (
                <li key={note.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap">{note.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-5">
          <form action={updateBugReportAction} className="space-y-4 rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Triage</h2>
            <input type="hidden" name="reportId" value={report.id} />
            <Select name="status" label="Status" value={report.status}>
              {BUG_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </Select>
            <Select name="assignedOperatorId" label="Assigned operator" value={report.assigned_operator_id ?? ""}>
              <option value="">Unassigned</option>
              {detail.operators.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.display_name}</option>)}
            </Select>
            <Select name="relatedReleaseId" label="Related release" value={report.related_release_id ?? ""}>
              <option value="">None</option>
              {detail.releases.map((release) => <option key={release.id} value={release.id}>{release.release_identifier}</option>)}
            </Select>
            <label className="block text-sm font-semibold">External issue reference
              <input name="externalIssueReference" defaultValue={report.external_issue_reference ?? ""} className="mt-2 min-h-11 w-full rounded-md border px-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Resolution notes
              <textarea name="resolutionNotes" defaultValue={report.resolution_notes ?? ""} rows={4} className="mt-2 w-full rounded-md border p-3 font-normal" />
            </label>
            <button className="min-h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">Save report</button>
          </form>
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-semibold">Safe diagnostics</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Datum label="Severity" value={report.customer_severity} />
              <Datum label="Route" value={report.relevant_route} />
              <Datum label="Version" value={report.application_version} />
              <Datum label="Environment" value={report.environment} />
              <Datum label="Correlation ID" value={report.correlation_id} />
              {report.diagnostic_consent ? (
                <>
                  <Datum label="Browser / OS" value={report.browser_os} />
                  <Datum label="Viewport" value={report.viewport_width && report.viewport_height ? `${report.viewport_width} × ${report.viewport_height}` : null} />
                  <Datum label="Client error reference" value={report.client_error_reference} />
                </>
              ) : <Datum label="Extended diagnostics" value="Consent not provided" />}
            </dl>
          </section>
        </aside>
      </section>
    </div>
  );
}

function ReportText({ title, body }: { title: string; body: string | null }) {
  return <section className="rounded-lg border bg-white p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{body || "Not provided."}</p></section>;
}
function Select({ name, label, value, children }: { name: string; label: string; value: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}<select name={name} defaultValue={value} className="mt-2 min-h-11 w-full rounded-md border px-3 font-normal">{children}</select></label>;
}
function Datum({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd className="mt-0.5 break-words">{value || "Not available"}</dd></div>;
}
