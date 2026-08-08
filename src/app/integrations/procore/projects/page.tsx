import Link from "next/link";

import { mapProcoreProjectAction } from "./actions";
import { canManageIntegrations } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProcoreProjectsPage() {
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const connection = await client
    .from("integration_connections")
    .select("id,company_name,status")
    .eq("organization_id", context.organizationId)
    .eq("provider", "procore")
    .maybeSingle();
  if (connection.error) throw new Error(connection.error.message);
  if (!connection.data)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Manage Procore projects</h1>
        <p className="mt-2 text-sm">Connect Procore before mapping projects.</p>
      </div>
    );
  const mappings = await client
    .from("integration_project_mappings")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("connection_id", connection.data.id)
    .order("procore_project_name");
  if (mappings.error) throw new Error(mappings.error.message);
  const projects = await client
    .from("projects")
    .select("id,name,project_number")
    .eq("organization_id", context.organizationId)
    .order("name");
  if (projects.error) throw new Error(projects.error.message);
  const manageable = canManageIntegrations(context);
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <Link href="/integrations" className="text-sm underline">
          ← Integrations
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Manage Procore projects</h1>
        <p className="mt-1 text-sm text-slate-600">
          {connection.data.company_name} ·{" "}
          {connection.data.status.replaceAll("_", " ")}
        </p>
      </header>
      <div className="space-y-3">
        {(mappings.data ?? []).map((mapping) => (
          <div key={mapping.id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{mapping.procore_project_name}</p>
                <p className="text-xs text-slate-500">
                  Procore #
                  {mapping.procore_project_number ?? mapping.procore_project_id}{" "}
                  · <span className="capitalize">{mapping.mapping_status}</span>
                </p>
              </div>
              {manageable ? (
                <form
                  action={mapProcoreProjectAction}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="mappingId" value={mapping.id} />
                  <select
                    name="projectId"
                    defaultValue={mapping.sightline_project_id ?? ""}
                    className="min-h-10 rounded-md border px-2"
                  >
                    <option value="">Select Sightline project</option>
                    {(projects.data ?? []).map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} · {project.project_number}
                      </option>
                    ))}
                  </select>
                  <button
                    name="mode"
                    value="map"
                    className="min-h-10 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white"
                  >
                    Map
                  </button>
                  <button
                    name="mode"
                    value="create"
                    className="min-h-10 rounded-md border px-3 text-xs font-semibold"
                  >
                    Create
                  </button>
                  <button
                    name="mode"
                    value="skip"
                    className="min-h-10 rounded-md border px-3 text-xs font-semibold"
                  >
                    Skip
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
        {!mappings.data?.length ? (
          <p className="rounded-lg border bg-white p-8 text-center text-sm text-slate-600">
            No Procore projects have been discovered yet. Use Sync now from the
            Integrations page.
          </p>
        ) : null}
      </div>
    </div>
  );
}
