import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminPageHeader,
  formatDateTime,
  StatusPill,
} from "@/features/platform-admin/data-ui";
import { ErrorInvestigationService } from "@/features/platform-admin/error-investigation";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { humanize } from "@/features/platform-admin/services";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function PlatformErrorDetailPage({
  params,
}: {
  params: Promise<{ errorId: string }>;
}) {
  const { errorId } = await params;
  const operator = await requirePlatformPermission(
    "platform.support.read",
    "application_error",
    errorId,
  );
  const investigation = await new ErrorInvestigationService(
    createAdminSupabaseClient(),
  ).get(errorId);
  if (!investigation) notFound();
  const { report } = investigation;

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/internal/admin/errors"
        className="text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Production errors
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Error investigation"
          title={report.error_name}
          description={report.error_message}
        />
        <StatusPill value={report.severity} />
      </div>

      <section
        aria-labelledby="error-context"
        className="rounded-lg border bg-white p-5"
      >
        <h2 id="error-context" className="font-semibold">
          Request context
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Occurred" value={formatDateTime(report.occurred_at)} />
          <Detail label="Source" value={humanize(report.source)} />
          <Detail label="Environment" value={report.environment} />
          <Detail
            label="Application version"
            value={report.application_version}
          />
          <Detail
            label="Request"
            value={`${report.request_method ?? "—"} ${report.request_path ?? "—"}`}
          />
          <Detail label="Request ID" value={report.request_id} mono />
          <Detail label="Correlation ID" value={report.correlation_id} mono />
          <Detail
            label="User agent"
            value={report.user_agent ?? "Unavailable"}
          />
        </dl>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold">Affected account</h2>
          <dl className="mt-4 space-y-4">
            <DetailLink
              label="Organization"
              value={investigation.organization?.name ?? "Unavailable"}
              href={
                investigation.organization
                  ? `/internal/admin/organizations/${investigation.organization.id}`
                  : null
              }
            />
            <DetailLink
              label="Application user"
              value={
                investigation.affectedUser
                  ? `${investigation.affectedUser.fullName} · ${investigation.affectedUser.email}`
                  : (investigation.affectedAuthEmail ?? "Unavailable")
              }
              href={
                investigation.affectedUser && report.auth_user_id
                  ? `/internal/admin/users/${report.auth_user_id}`
                  : null
              }
            />
          </dl>
        </section>
        <section className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold">Related release</h2>
          {investigation.relatedRelease ? (
            <div className="mt-4">
              <Link
                href={`/internal/admin/releases/${investigation.relatedRelease.id}`}
                className="font-semibold hover:underline"
              >
                {investigation.relatedRelease.identifier}
              </Link>
              <p className="mt-2 text-sm text-slate-600">
                {investigation.relatedRelease.applicationVersion} ·{" "}
                {humanize(investigation.relatedRelease.status)}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {investigation.relatedRelease.commitSha ?? "Commit unavailable"}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No matching release was recorded for this environment and
              application version.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Stack trace</h2>
        {report.stack_trace ? (
          <pre className="mt-4 max-h-[32rem] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 whitespace-pre-wrap text-slate-100">
            {report.stack_trace}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No stack trace was captured.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <SafeJson title="Safe metadata" value={report.safe_metadata} />
        <SafeJson title="Browser context" value={report.browser_context} />
      </div>

      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b p-5">
          <h2 className="font-semibold">
            Similar occurrences ({investigation.similarCount})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Same error name, source, environment, and request path.
          </p>
        </div>
        {investigation.similar.length ? (
          <ul className="divide-y">
            {investigation.similar.map((similar) => (
              <li
                key={similar.id}
                className="flex flex-wrap justify-between gap-3 p-4"
              >
                <div>
                  <Link
                    href={`/internal/admin/errors/${similar.id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {similar.error_message}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {similar.correlation_id}
                  </p>
                </div>
                <time className="text-xs text-slate-500">
                  {formatDateTime(similar.occurred_at)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            No similar occurrences were found.
          </p>
        )}
      </section>
      <p className="text-xs text-slate-500">
        Viewed by {operator.displayName}. This investigation is recorded in the
        platform audit log.
      </p>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm break-words ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function DetailLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">
        {href ? (
          <Link href={href} className="font-semibold hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function SafeJson({ title, value }: { title: string; value: Json }) {
  const hasValues =
    value && typeof value === "object" && Object.keys(value).length > 0;
  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      {hasValues ? (
        <pre className="mt-4 overflow-auto rounded-md bg-slate-50 p-4 text-xs leading-5 whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No {title.toLowerCase()} was captured.
        </p>
      )}
    </section>
  );
}
