import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ActionControls } from "@/features/actions/action-controls";
import { getActionsWorkspace } from "@/features/actions/data";
import { actionFiltersSchema } from "@/features/actions/validation";
import { WatchlistButton } from "@/features/workspace/watchlist-button";
import { commitmentTiming } from "@/features/commitment-follow-ups/state";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default async function ActionsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = actionFiltersSchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    ),
  );
  const workspace = await getActionsWorkspace(filters);
  return (
    <main className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">Risk response</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Actions
        </h1>
        <p className="text-muted mt-2 max-w-2xl">
          Decide who will act, what is due, and which profit risks still need a
          response.
        </p>
      </header>
      <Card className="mt-6">
        <form
          className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"
          role="search"
        >
          <label className="text-muted text-xs">
            Search
            <input
              name="search"
              defaultValue={filters.search}
              className="border-border bg-surface mt-1 min-h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <Filter
            name="status"
            label="Status"
            value={filters.status}
            options={[
              "all",
              "suggested",
              "accepted",
              "in_progress",
              "completed",
              "dismissed",
            ]}
          />
          <Filter
            name="owner"
            label="Owner"
            value={filters.owner}
            options={[
              "all",
              "unassigned",
              ...workspace.owners.map((owner) => owner.id),
            ]}
            labels={Object.fromEntries(
              workspace.owners.map((owner) => [owner.id, owner.name]),
            )}
          />
          <Filter
            name="priority"
            label="Priority"
            value={filters.priority}
            options={["all", "low", "normal", "high", "urgent"]}
          />
          <Filter
            name="project"
            label="Project"
            value={filters.project}
            options={[
              "all",
              ...workspace.projects.map((project) => project.id),
            ]}
            labels={Object.fromEntries(
              workspace.projects.map((project) => [project.id, project.name]),
            )}
          />
          <Filter
            name="due"
            label="Due"
            value={filters.due}
            options={["all", "overdue", "today", "week", "none"]}
          />
          <button className="bg-deep-green min-h-10 rounded-md px-4 text-sm font-semibold text-white md:col-span-3 xl:col-span-1">
            Apply filters
          </button>
        </form>
      </Card>
      {workspace.followUps.length ? (
        <section className="mt-6" aria-labelledby="external-follow-ups-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-deep-green text-xs font-semibold tracking-wide uppercase">
                External commitments
              </p>
              <h2
                id="external-follow-ups-title"
                className="mt-1 text-xl font-semibold"
              >
                Waiting on a response
              </h2>
            </div>
            <span className="text-muted text-sm">
              {workspace.followUps.length} open
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {workspace.followUps.map(({ followUp, risk, project }) => {
              const timing = commitmentTiming(followUp);
              return (
                <Link
                  key={followUp.id}
                  href={`/risks/${followUp.risk_id}/email-draft?draftId=${followUp.email_draft_id}`}
                  className="border-border bg-surface hover:border-deep-green rounded-xl border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {followUp.requested_commitment}
                      </p>
                      <p className="text-muted mt-1 text-xs">
                        {project?.name ?? risk?.title ?? "Risk follow-up"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${timing === "overdue" ? "bg-danger/10 text-danger" : timing === "received" ? "bg-soft-green text-deep-green" : "bg-soft-amber text-warning"}`}
                    >
                      {timing === "overdue"
                        ? "Overdue"
                        : timing === "received"
                          ? "Verify response"
                          : timing === "due_today"
                            ? "Due today"
                            : "Awaiting"}
                    </span>
                  </div>
                  <p className="text-muted mt-3 text-xs">
                    Expected{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(followUp.expected_response_at))}{" "}
                    →
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
      <section className="mt-6" aria-label="Organization actions">
        {workspace.rows.length ? (
          <ul className="space-y-4">
            {workspace.rows.map(({ action, risk, project }) => (
              <li key={action.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{action.title}</h2>
                      <p className="text-muted mt-1 text-sm">
                        {action.description}
                      </p>
                      <p className="text-muted mt-2 text-xs">
                        {project?.name ?? "No project"} ·{" "}
                        <Link
                          className="text-deep-green font-semibold"
                          href={`/risks/${action.riskId}`}
                        >
                          {risk?.title ?? "View risk"}
                        </Link>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.dueAt &&
                        new Date(action.dueAt) < new Date() &&
                        !["completed", "dismissed"].includes(action.status) && (
                          <span className="bg-danger/10 text-danger rounded-full px-2.5 py-1 text-xs font-semibold">
                            Overdue
                          </span>
                        )}
                      <WatchlistButton
                        item={{
                          id: action.id,
                          type: "action",
                          title: action.title,
                          detail:
                            project?.name ?? risk?.title ?? "Risk response",
                          href: `/risks/${action.riskId}`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <ActionControls
                      initialAction={action}
                      owners={workspace.owners}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <div className="py-10 text-center">
              <h2 className="font-semibold">No actions match this view</h2>
              <p className="text-muted mt-2 text-sm">
                Clear or adjust the filters to see other risk actions.
              </p>
              <Link
                href="/actions"
                className="text-deep-green mt-4 inline-block font-semibold"
              >
                Clear filters
              </Link>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}
function Filter({
  name,
  label,
  value,
  options,
  labels = {},
}: {
  name: string;
  label: string;
  value: string;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="text-muted text-xs">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="border-border bg-surface mt-1 min-h-10 w-full rounded-md border px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
