import Link from "next/link";

import { setProjectArchivedAction } from "@/app/projects/[projectId]/actions";
import { Card } from "@/components/ui/card";
import { getOrganizationCapacity } from "@/features/billing/entitlements";
import { canCreateProject } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function ArchivedProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const adminClient = createAdminSupabaseClient();
  const [{ data: projects, error }, capacity] = await Promise.all([
    adminClient
      .from("projects")
      .select("id,name,project_number,archived_at")
      .eq("organization_id", context.organizationId)
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    getOrganizationCapacity(client, context.organizationId),
  ]);
  if (error) throw new Error(error.message);
  const canManage = canCreateProject(context, {
    organization_id: context.organizationId,
  });
  const limitError = (await searchParams).error === "limit";
  return (
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-8 sm:py-10">
      <Link href="/projects" className="text-deep-green text-sm font-semibold">
        ← Back to projects
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Archived projects</h1>
      <p className="text-muted mt-2 text-sm">
        Archived projects do not count toward the {capacity.name} plan limit of
        {` ${capacity.maxProjects}`} active projects.
      </p>
      {limitError ? (
        <p
          role="alert"
          className="bg-soft-red text-danger mt-5 rounded-md p-3 text-sm"
        >
          Restore is unavailable because your active-project limit has been
          reached.
        </p>
      ) : null}
      <div className="mt-6 space-y-3">
        {(projects ?? []).length ? (
          (projects ?? []).map((project) => (
            <Card
              key={project.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-semibold">{project.name}</p>
                <p className="text-muted mt-1 text-xs">
                  {project.project_number}
                </p>
              </div>
              {canManage ? (
                <form
                  action={setProjectArchivedAction.bind(
                    null,
                    project.id,
                    false,
                  )}
                >
                  <button className="text-deep-green text-sm font-semibold underline">
                    Restore
                  </button>
                </form>
              ) : null}
            </Card>
          ))
        ) : (
          <Card className="p-6 text-sm">No archived projects.</Card>
        )}
      </div>
    </div>
  );
}
