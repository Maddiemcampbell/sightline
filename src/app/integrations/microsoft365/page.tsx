import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Microsoft365Repository } from "@/features/microsoft365/repository";
import { canManageIntegrations } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  addSharePointSiteAction,
  disconnectMicrosoft365Action,
  saveLibraryMappingAction,
  syncMicrosoft365Action,
} from "./actions";

export default async function Microsoft365Page({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const notice = await searchParams;
  const context = await requireActorContext();
  const canManage = canManageIntegrations(context);
  const client = createAdminSupabaseClient();
  const repository = new Microsoft365Repository(client);
  const [connection, mappings, projectsResult] = await Promise.all([
    repository.connection(context.organizationId),
    repository.mappings(context.organizationId),
    client
      .from("projects")
      .select("id,name")
      .eq("organization_id", context.organizationId)
      .order("name"),
  ]);
  if (projectsResult.error) throw new Error(projectsResult.error.message);

  return (
    <div className="mx-auto max-w-5xl px-[var(--page-gutter)] py-8 sm:py-10">
      <Link
        href="/integrations"
        className="text-deep-green text-sm font-semibold"
      >
        ← Integrations
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
        Microsoft 365
      </h1>
      <p className="text-muted mt-2 max-w-2xl leading-6">
        Connect a Microsoft tenant, add SharePoint sites already granted to
        Sightline, and map document libraries to projects.
      </p>
      {notice.connected === "true" && (
        <p className="bg-soft-green text-deep-green mt-5 rounded-md px-4 py-3 text-sm font-semibold">
          Microsoft 365 tenant connected.
        </p>
      )}
      {notice.error && (
        <p className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {notice.error === "consent_denied"
            ? "Microsoft administrator consent was not granted."
            : notice.error === "invalid_state"
              ? "The connection request expired or was already used. Start again."
              : "Sightline could not verify the Microsoft tenant. Check the Entra application configuration and try again."}
        </p>
      )}

      {!connection || connection.status === "disconnected" ? (
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Connect your tenant</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            A Microsoft 365 administrator must approve the requested application
            permissions. Sightline requests read-only access to explicitly
            granted SharePoint sites.
          </p>
          {canManage ? (
            <form
              method="post"
              action="/api/integrations/microsoft365/connect"
              className="mt-4"
            >
              <button className="bg-deep-green min-h-10 rounded-md px-4 text-sm font-semibold text-white">
                Connect Microsoft 365
              </button>
            </form>
          ) : (
            <p className="text-muted mt-4 text-sm">Manager access required.</p>
          )}
        </Card>
      ) : (
        <>
          <Card className="mt-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {connection.company_name}
                </p>
                <p className="text-muted mt-1 text-xs">
                  Tenant {connection.company_id}
                </p>
                <p className="text-deep-green mt-2 text-xs font-semibold capitalize">
                  {connection.status.replaceAll("_", " ")}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <form action={syncMicrosoft365Action}>
                    <button className="bg-deep-green min-h-10 rounded-md px-4 text-sm font-semibold text-white">
                      Sync now
                    </button>
                  </form>
                  <form action={disconnectMicrosoft365Action}>
                    <button className="border-border min-h-10 rounded-md border px-4 text-sm font-semibold">
                      Disconnect
                    </button>
                  </form>
                </div>
              )}
            </div>
          </Card>

          {canManage && (
            <Card className="mt-6">
              <h2 className="text-lg font-semibold">
                Add an authorized SharePoint site
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Enter the full site URL after your Microsoft administrator has
                granted this application access to that site.
              </p>
              <form
                action={addSharePointSiteAction}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  name="siteUrl"
                  type="url"
                  required
                  placeholder="https://contoso.sharepoint.com/sites/Construction"
                  className="border-border min-h-10 flex-1 rounded-md border px-3 text-sm"
                />
                <button className="bg-deep-green min-h-10 rounded-md px-4 text-sm font-semibold text-white">
                  Discover libraries
                </button>
              </form>
            </Card>
          )}

          <section className="mt-8 space-y-4" aria-label="SharePoint libraries">
            <h2 className="text-xl font-semibold">Document libraries</h2>
            {mappings.length === 0 ? (
              <p className="text-muted text-sm">No libraries discovered yet.</p>
            ) : (
              mappings.map((mapping) => (
                <Card key={mapping.id}>
                  <p className="text-sm font-semibold">{mapping.drive_name}</p>
                  <a
                    href={mapping.site_url}
                    className="text-deep-green mt-1 block text-xs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {mapping.site_name}
                  </a>
                  {canManage && (
                    <form
                      action={saveLibraryMappingAction}
                      className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    >
                      <input
                        type="hidden"
                        name="mappingId"
                        value={mapping.id}
                      />
                      <select
                        name="projectId"
                        defaultValue={mapping.project_id ?? ""}
                        className="border-border min-h-10 rounded-md border px-3 text-sm"
                      >
                        <option value="">Choose a project</option>
                        {projectsResult.data.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="selected"
                          defaultChecked={mapping.selected}
                        />{" "}
                        Sync
                      </label>
                      <button className="border-border min-h-10 rounded-md border px-4 text-sm font-semibold">
                        Save
                      </button>
                    </form>
                  )}
                  <p className="text-muted mt-3 text-xs">
                    {mapping.last_completed_at
                      ? `Last synchronized ${new Date(mapping.last_completed_at).toLocaleString()}`
                      : "Not synchronized yet"}
                  </p>
                  {mapping.last_error && (
                    <p className="mt-2 text-xs text-red-700">
                      {mapping.last_error}
                    </p>
                  )}
                </Card>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
