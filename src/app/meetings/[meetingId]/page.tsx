import { CheckCircle2, ExternalLink, ListChecks } from "lucide-react";
import Link from "next/link";

import { completeMeetingAction } from "@/app/meetings/actions";
import { Card } from "@/components/ui/card";
import { MeetingCapturePanel } from "@/features/meetings/meeting-capture-panel";
import { getMeetingWorkspace } from "@/features/meetings/data";
import { meetingTypeLabels } from "@/features/meetings/types";
import { can } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const workspace = await getMeetingWorkspace(meetingId);
  const { meeting } = workspace;
  const editable =
    meeting.status !== "completed" && can(workspace.context, "action:edit");
  const riskById = new Map(workspace.risks.map((risk) => [risk.id, risk]));
  const projectById = new Map(
    workspace.projects.map((project) => [project.id, project]),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-7 px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Link
            href="/meetings"
            className="text-deep-green text-sm font-semibold"
          >
            ← Meeting records
          </Link>
          <p className="text-muted mt-5 text-sm font-semibold">
            {meetingTypeLabels[meeting.meeting_type]}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            {meeting.title}
          </h1>
          <p className="text-muted mt-2">
            {formatDate(meeting.starts_at)} · {meeting.project_ids.length}{" "}
            projects
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${meeting.status === "completed" ? "bg-soft-green text-deep-green" : "bg-soft-amber text-warning"}`}
        >
          {meeting.status === "completed" ? "Completed" : "Ready to facilitate"}
        </span>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="border-border flex items-center gap-3 border-b p-5 sm:p-6">
          <ListChecks className="text-deep-green size-5" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">Generated agenda</h2>
            <p className="text-muted mt-1 text-sm">
              Review sources, record outcomes, and close with explicit
              ownership.
            </p>
          </div>
        </div>
        <ol className="divide-y">
          {meeting.agenda.map((item, index) => (
            <li
              key={item.id}
              className="grid gap-3 p-5 sm:grid-cols-[2rem_1fr_auto] sm:p-6"
            >
              <span className="bg-background text-deep-green grid size-8 place-items-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              <div>
                <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
                  {item.section}
                </p>
                <h3 className="mt-1 font-semibold">{item.title}</h3>
                <p className="text-muted mt-2 text-sm leading-6">
                  {item.detail}
                </p>
              </div>
              {item.sourceHref ? (
                <Link
                  href={item.sourceHref}
                  className="text-deep-green inline-flex items-center gap-1 text-sm font-semibold"
                >
                  {item.sourceLabel}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      {editable ? (
        <MeetingCapturePanel
          meetingId={meeting.id}
          projects={workspace.projects}
          risks={workspace.risks}
          owners={workspace.owners}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Decisions recorded</h2>
          {workspace.decisions.length ? (
            <ol className="mt-4 space-y-4">
              {workspace.decisions.map((decision, index) => (
                <li key={decision.id} className="border-border border-l-2 pl-4">
                  <p className="font-semibold">
                    {index + 1}. {decision.summary}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {decision.project_id
                      ? projectById.get(decision.project_id)?.name
                      : "Portfolio"}
                    {decision.risk_id
                      ? ` · ${riskById.get(decision.risk_id)?.title ?? "Risk"}`
                      : ""}
                  </p>
                  {decision.rationale ? (
                    <p className="text-muted mt-2 text-sm">
                      {decision.rationale}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted mt-3 text-sm">
              No decisions recorded yet.
            </p>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Follow-up actions</h2>
          {workspace.actions.length ? (
            <ul className="mt-4 space-y-3">
              {workspace.actions.map((action) => (
                <li
                  key={action.id}
                  className="border-border rounded-md border p-3"
                >
                  <Link
                    href={`/actions?search=${encodeURIComponent(action.title)}`}
                    className="hover:text-deep-green font-semibold"
                  >
                    {action.title}
                  </Link>
                  <p className="text-muted mt-1 text-xs capitalize">
                    {action.priority} · {action.status.replaceAll("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mt-3 text-sm">
              No follow-up actions created yet.
            </p>
          )}
        </Card>
      </div>

      {editable ? (
        <Card className="bg-deep-green border-deep-green text-white">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="text-lg font-semibold">Close the meeting</h2>
              <p className="mt-1 text-sm text-white/70">
                Confirm every decision and follow-up before making this record
                read-only.
              </p>
            </div>
            <form action={completeMeetingAction}>
              <input type="hidden" name="meetingId" value={meeting.id} />
              <button className="bg-accent text-deep-green inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Complete meeting
              </button>
            </form>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
