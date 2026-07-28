import Link from "next/link";

import { FeatureFlagRepository } from "@/features/feature-flags/repository";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createFeatureFlagAction, updateFeatureFlagAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlatformAdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission(
    "platform.flags.manage",
    "admin_page",
    "platform_settings",
  );
  const raw = await searchParams;
  const query = typeof raw.q === "string" ? raw.q.slice(0, 80) : "";
  const status =
    raw.status === "enabled" || raw.status === "disabled" ? raw.status : "all";
  const environment =
    typeof raw.environment === "string" ? raw.environment : "all";
  const repository = new FeatureFlagRepository(createAdminSupabaseClient());
  const [flags, changes] = await Promise.all([
    repository.list({ query, status, environment }),
    repository.changes(),
  ]);
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-offset-2">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Platform Operations
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Feature flags</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Staff-only release controls. Flags never bypass authorization.
          </p>
        </div>
        <Link
          href="/internal/admin/releases"
          className="rounded-md border bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          View releases
        </Link>
      </div>
      <form className="mt-7 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          Search
          <input
            name="q"
            defaultValue={query}
            className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          Status
          <select
            name="status"
            defaultValue={status}
            className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
          >
            <option value="all">All</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Environment
          <select
            name="environment"
            defaultValue={environment}
            className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
          >
            <option value="all">All</option>
            <option value="development">Development</option>
            <option value="preview">Preview</option>
            <option value="production">Production</option>
          </select>
        </label>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-3 sm:justify-self-start">
          Apply filters
        </button>
      </form>
      <section className="mt-6" aria-labelledby="create-flag-title">
        <h2 id="create-flag-title" className="text-lg font-semibold">
          Create flag
        </h2>
        <FlagForm action={createFeatureFlagAction} />
      </section>
      <section className="mt-8" aria-labelledby="existing-flags-title">
        <h2 id="existing-flags-title" className="text-lg font-semibold">
          Existing flags
        </h2>
        <div className="mt-3 grid gap-4">
          {flags.map((flag) => (
            <FlagForm
              key={flag.id}
              action={updateFeatureFlagAction}
              flag={flag}
            />
          ))}
          {!flags.length ? (
            <p className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500">
              No flags match these filters.
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-8" aria-labelledby="flag-history-title">
        <h2 id="flag-history-title" className="text-lg font-semibold">
          Recent changes
        </h2>
        <ul className="mt-3 divide-y rounded-lg border bg-white">
          {changes.map((change) => (
            <li key={change.id} className="px-4 py-3 text-sm">
              <span className="font-semibold capitalize">
                {change.change_type}
              </span>{" "}
              · {new Date(change.created_at).toLocaleString()}
            </li>
          ))}
          {!changes.length ? (
            <li className="p-6 text-sm text-slate-500">No changes recorded.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function FlagForm({
  action,
  flag,
}: {
  action: (formData: FormData) => Promise<void>;
  flag?: Awaited<ReturnType<FeatureFlagRepository["list"]>>[number];
}) {
  return (
    <form
      action={action}
      aria-label={flag ? `Edit ${flag.name}` : "Create flag"}
      className="mt-3 grid min-w-0 gap-3 rounded-lg border bg-white p-4 md:grid-cols-2"
    >
      {flag ? <input type="hidden" name="id" value={flag.id} /> : null}
      <label className="text-sm font-semibold">
        Stable key
        <input
          name="key"
          required
          readOnly={Boolean(flag)}
          defaultValue={flag?.key}
          className="mt-1 min-h-10 w-full rounded-md border px-3 font-mono font-normal read-only:bg-slate-50"
        />
      </label>
      <label className="text-sm font-semibold">
        Name
        <input
          name="name"
          required
          defaultValue={flag?.name}
          className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
        />
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        Description
        <textarea
          name="description"
          defaultValue={flag?.description}
          className="mt-1 min-h-20 w-full rounded-md border px-3 py-2 font-normal"
        />
      </label>
      <TargetField
        name="environments"
        label="Environments"
        hint="development, preview, production"
        value={flag?.environments.join(", ")}
      />
      <TargetField
        name="organizationIds"
        label="Organization IDs"
        hint="Comma-separated UUIDs"
        value={flag?.organizationIds.join(", ")}
      />
      <TargetField
        name="userIds"
        label="User IDs"
        hint="Optional comma-separated UUIDs"
        value={flag?.userIds.join(", ")}
      />
      <label className="text-sm font-semibold">
        Rollout percentage
        <input
          name="rolloutPercentage"
          type="number"
          min="0"
          max="100"
          required
          defaultValue={flag?.rolloutPercentage ?? 100}
          className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
        />
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
        <input name="enabled" type="checkbox" defaultChecked={flag?.enabled} />
        Enabled
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
        <input
          name="defaultEnabled"
          type="checkbox"
          defaultChecked={flag?.defaultEnabled}
        />
        Default fallback
      </label>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2 md:justify-self-start">
        {flag ? "Save flag" : "Create flag"}
      </button>
    </form>
  );
}

function TargetField({
  name,
  label,
  hint,
  value,
}: {
  name: string;
  label: string;
  hint: string;
  value: string | undefined;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        name={name}
        defaultValue={value}
        placeholder={hint}
        className="mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
      />
    </label>
  );
}
