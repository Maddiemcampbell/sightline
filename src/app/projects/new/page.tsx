import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderPlus } from "lucide-react";

import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Card } from "@/components/ui/card";
import { canCreateProject, canViewProject } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { getOrganizationCapacity } from "@/features/billing/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = Readonly<{
  searchParams: Promise<{ welcome?: string }>;
}>;

export default async function NewProjectPage({ searchParams }: Props) {
  const context = await requireActorContext();
  if (!canViewProject(context)) redirect("/");
  const canCreate = canCreateProject(context, {
    organization_id: context.organizationId,
  });
  const capacity = await getOrganizationCapacity(
    await createServerSupabaseClient(),
    context.organizationId,
  );
  const welcome = (await searchParams).welcome;

  return (
    <div className="mx-auto max-w-3xl px-[var(--page-gutter)] py-8 sm:py-12">
      <header>
        <span className="bg-soft-green text-deep-green grid size-11 place-items-center rounded-full">
          <FolderPlus aria-hidden="true" className="size-5" />
        </span>
        <p className="text-deep-green mt-5 text-sm font-semibold">
          {welcome === "invitation"
            ? "Invitation accepted"
            : welcome === "organization"
              ? "Organization created"
              : "Welcome to Sightline"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Add your first project
        </h1>
        <p className="text-muted mt-3 max-w-2xl leading-7">
          Projects provide the secure workspace for risks, actions, documents,
          evidence, collaboration, and portfolio intelligence.
        </p>
      </header>
      <Card className="mt-8 p-5 sm:p-7">
        {canCreate && !capacity.atProjectLimit ? (
          <CreateProjectForm />
        ) : capacity.atProjectLimit ? (
          <div>
            <h2 className="text-lg font-semibold">Project limit reached</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              The {capacity.name} plan includes {capacity.maxProjects} active
              projects. Archive a project before creating another.
            </p>
            <Link
              href="/projects/archived"
              className="text-deep-green mt-4 inline-block text-sm font-semibold underline"
            >
              View archived projects
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">
              An organization administrator needs to create the first project
            </h2>
            <p className="text-muted mt-2 text-sm leading-6">
              Your membership is active, but your role cannot create projects.
              Ask an Owner or Administrator to create one and assign you.
            </p>
          </div>
        )}
      </Card>
      <Link
        href="/projects"
        className="text-deep-green mt-5 inline-block text-sm font-semibold underline-offset-4 hover:underline"
      >
        View the project workspace
      </Link>
    </div>
  );
}
