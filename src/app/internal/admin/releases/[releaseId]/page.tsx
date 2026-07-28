import { notFound } from "next/navigation";

import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { ReleaseRepository } from "@/features/releases/repository";
import { ReleaseTrackingService } from "@/features/releases/service";
import { RELEASE_STATUSES } from "@/features/releases/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { updateReleaseAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ releaseId: string }>;
}) {
  const { releaseId } = await params;
  await requirePlatformPermission(
    "platform.releases.read",
    "release",
    releaseId,
  );
  const release = await new ReleaseTrackingService(
    new ReleaseRepository(createAdminSupabaseClient()),
  ).get(releaseId);
  if (!release) notFound();
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-7 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-offset-2">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Release detail
      </p>
      <h1 className="mt-2 text-2xl font-semibold break-words sm:text-3xl">
        {release.identifier}
      </h1>
      <dl className="mt-6 grid gap-3 rounded-lg border bg-white p-5 sm:grid-cols-2">
        <Item label="Application version" value={release.applicationVersion} />
        <Item label="Environment" value={release.environment} />
        <Item label="Status" value={release.status.replace("_", " ")} />
        <Item
          label="Deployment timestamp"
          value={
            release.deployedAt
              ? new Date(release.deployedAt).toLocaleString()
              : "Not recorded"
          }
        />
        <Item label="Commit SHA" value={release.commitSha ?? "Not recorded"} />
        <Item
          label="Source reference"
          value={release.sourceReference ?? "Not recorded"}
        />
        <Item
          label="Deployed by"
          value={release.deployedBy ?? "Not recorded"}
        />
        <Item
          label="Rollback status"
          value={release.rollbackStatus.replaceAll("_", " ")}
        />
      </dl>
      <section className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Linked feature flags</h2>
        <ul className="mt-2 text-sm text-slate-600">
          {release.linkedFlags.map((flag) => (
            <li key={flag.id}>
              {flag.name} · <code>{flag.key}</code>
            </li>
          ))}
          {!release.linkedFlags.length ? <li>No linked flags.</li> : null}
        </ul>
      </section>
      <form
        action={updateReleaseAction}
        className="mt-6 grid gap-4 rounded-lg border bg-white p-5"
      >
        <input type="hidden" name="id" value={release.id} />
        <label className="text-sm font-semibold">
          Status
          <select
            name="status"
            defaultValue={release.status}
            className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal capitalize"
          >
            {RELEASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Rollback status
          <select
            name="rollbackStatus"
            defaultValue={release.rollbackStatus}
            className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
          >
            <option value="not_rolled_back">Not rolled back</option>
            <option value="rollback_pending">Rollback pending</option>
            <option value="rolled_back">Rolled back</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Release notes
          <textarea
            name="releaseNotes"
            defaultValue={release.releaseNotes}
            className="mt-1 min-h-32 w-full rounded-md border px-3 py-2 font-normal"
          />
        </label>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:justify-self-start">
          Save release metadata
        </button>
      </form>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm break-words capitalize">{value}</dd>
    </div>
  );
}
