import Link from "next/link";

import { FeatureFlagRepository } from "@/features/feature-flags/repository";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { ReleaseRepository } from "@/features/releases/repository";
import { ReleaseTrackingService } from "@/features/releases/service";
import {
  RELEASE_STATUSES,
  type ReleaseStatus,
} from "@/features/releases/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createReleaseAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission(
    "platform.releases.read",
    "admin_page",
    "releases",
  );
  const raw = await searchParams;
  const environment =
    typeof raw.environment === "string" ? raw.environment : "all";
  const status = isReleaseStatus(raw.status) ? raw.status : "all";
  const order = raw.order === "asc" ? "asc" : "desc";
  const client = createAdminSupabaseClient();
  const [releases, flags] = await Promise.all([
    new ReleaseTrackingService(new ReleaseRepository(client)).list({
      environment,
      status,
      order,
    }),
    new FeatureFlagRepository(client).list({
      query: "",
      status: "all",
      environment: "all",
    }),
  ]);
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-offset-2">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Platform Operations
      </p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Releases</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Verified operational metadata only. Sightline does not deploy or roll
        back applications from this page.
      </p>
      <form className="mt-7 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
        <Select
          name="environment"
          label="Environment"
          value={environment}
          options={["all", "development", "preview", "production"]}
        />
        <Select
          name="status"
          label="Status"
          value={status}
          options={["all", ...RELEASE_STATUSES]}
        />
        <Select
          name="order"
          label="Deployment order"
          value={order}
          options={["desc", "asc"]}
        />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-3 sm:justify-self-start">
          Apply filters
        </button>
      </form>
      <section className="mt-6" aria-labelledby="record-release-title">
        <h2 id="record-release-title" className="text-lg font-semibold">
          Record release
        </h2>
        <form
          action={createReleaseAction}
          aria-label="Record release"
          className="mt-3 grid min-w-0 gap-3 rounded-lg border bg-white p-4 md:grid-cols-2"
        >
          <Field name="identifier" label="Release identifier" required />
          <Field
            name="applicationVersion"
            label="Application version"
            required
          />
          <Select
            name="environment"
            label="Environment"
            value="production"
            options={["development", "preview", "production"]}
          />
          <Select
            name="status"
            label="Status"
            value="planned"
            options={[...RELEASE_STATUSES]}
          />
          <Field
            name="deployedAt"
            label="Deployment timestamp"
            type="datetime-local"
          />
          <Field name="commitSha" label="Commit SHA (optional)" />
          <Field name="sourceReference" label="Branch or source (optional)" />
          <Field name="deployedBy" label="Deployed by (optional)" />
          <label className="text-sm font-semibold md:col-span-2">
            Release notes
            <textarea
              name="releaseNotes"
              className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 font-normal"
            />
          </label>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold">
              Linked feature flags
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {flags.map((flag) => (
                <label
                  key={flag.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="featureFlagIds"
                    value={flag.id}
                  />
                  {flag.name}
                </label>
              ))}
              {!flags.length ? (
                <span className="text-sm text-slate-500">
                  No flags available.
                </span>
              ) : null}
            </div>
          </fieldset>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2 md:justify-self-start">
            Record release
          </button>
        </form>
      </section>
      <section className="mt-8" aria-labelledby="release-history-title">
        <h2 id="release-history-title" className="text-lg font-semibold">
          Release history
        </h2>
        <div className="mt-3 grid gap-3">
          {releases.map((release) => (
            <article
              key={release.id}
              className="min-w-0 rounded-lg border bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">
                    <Link
                      href={`/internal/admin/releases/${release.id}`}
                      className="hover:underline"
                    >
                      {release.identifier}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm break-words text-slate-600">
                    {release.applicationVersion} · {release.environment} ·{" "}
                    {release.status.replace("_", " ")}
                  </p>
                </div>
                <time className="text-xs text-slate-500">
                  {release.deployedAt
                    ? new Date(release.deployedAt).toLocaleString()
                    : "Deployment not recorded"}
                </time>
              </div>
            </article>
          ))}
          {!releases.length ? (
            <p className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500">
              No releases match these filters.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
      />
    </label>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly string[];
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal capitalize"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function isReleaseStatus(value: unknown): value is ReleaseStatus {
  return (
    typeof value === "string" &&
    RELEASE_STATUSES.some((status) => status === value)
  );
}
