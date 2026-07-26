import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getProjects } from "@/features/portfolio/data";
import { projectFiltersSchema } from "@/features/portfolio/validation";
import { WatchlistButton } from "@/features/workspace/watchlist-button";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectsPage({ searchParams }: Props) {
  const filters = projectFiltersSchema.parse(await searchParams);
  const projects = await getProjects(filters);
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-muted text-sm font-semibold">Portfolio</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Projects
        </h1>
        <p className="text-muted mt-2">
          See where projected margin is most exposed across active work.
        </p>
      </header>
      <form
        method="get"
        className="border-border bg-surface mt-7 grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(16rem,1fr)_12rem_14rem_auto]"
        aria-label="Project filters"
      >
        <label className="relative">
          <span className="sr-only">Search projects</span>
          <Search className="text-muted absolute top-3 left-3 size-4" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search projects…"
            className="border-border h-10 w-full rounded-md border pr-3 pl-9 text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Stage</span>
          <select
            name="stage"
            defaultValue={filters.stage}
            className="border-border h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="all">All stages</option>
            <option value="active">Active</option>
            <option value="planning">Planning</option>
            <option value="on_hold">On hold</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort projects</span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="border-border h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="exposure">Highest exposure</option>
            <option value="margin">Lowest margin</option>
            <option value="name">Name</option>
            <option value="activity">Recent activity</option>
          </select>
        </label>
        <button className="bg-deep-green h-10 rounded-md px-5 text-sm font-semibold text-white">
          Apply
        </button>
      </form>
      <p className="text-muted mt-5 text-sm">{projects.length} projects</p>
      {projects.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No projects match"
            description="Adjust the search or stage filter to see more projects."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted text-xs font-semibold">
                    {project.number} · {project.location}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{project.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-soft-green text-deep-green rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                    {project.stage.replace("_", " ")}
                  </span>
                  <WatchlistButton
                    item={{
                      id: project.id,
                      type: "project",
                      title: project.name,
                      detail: `${project.number} · ${project.location}`,
                      href: `/projects/${project.id}`,
                    }}
                  />
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-y py-4">
                <div>
                  <dt className="text-muted text-xs">
                    Estimated projected margin
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {formatMoney(project.projectedMarginCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">Open risks</dt>
                  <dd className="mt-1 font-semibold">
                    {project.openRiskCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">Estimated exposure</dt>
                  <dd className="mt-1 font-semibold">
                    {formatMoney(project.exposureCents)}
                  </dd>
                </div>
              </dl>
              <Link
                href={`/projects/${project.id}`}
                className="text-deep-green mt-4 inline-flex items-center gap-2 text-sm font-semibold"
              >
                View project <ArrowRight className="size-4" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
