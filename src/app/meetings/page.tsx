import { CalendarCheck2, Clock3, Plus } from "lucide-react";
import Link from "next/link";

import { createMeetingAction } from "@/app/meetings/actions";
import { Card } from "@/components/ui/card";
import { getMeetingPreparationData } from "@/features/meetings/data";
import { meetingTypeLabels, MEETING_TYPES } from "@/features/meetings/types";
import { can } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const { context, forecast, meetings } = await getMeetingPreparationData();
  const canPrepare = can(context, "action:edit");
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          Meeting workflow
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Prepare meeting
        </h1>
        <p className="text-muted mt-2 max-w-3xl">
          Turn current portfolio signals into an agenda, preserve decisions, and
          assign follow-up work without losing the evidence trail.
        </p>
      </header>

      {canPrepare ? (
        <Card>
          <div className="flex items-start gap-3">
            <span className="bg-soft-green text-deep-green grid size-10 shrink-0 place-items-center rounded-md">
              <Plus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Configure a meeting</h2>
              <p className="text-muted mt-1 text-sm">
                Sightline will build the agenda deterministically from the
                selected project scope.
              </p>
            </div>
          </div>
          <form action={createMeetingAction} className="mt-6 grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium md:col-span-1">
                Meeting name
                <input
                  name="title"
                  required
                  minLength={3}
                  defaultValue="Weekly portfolio review"
                  className="border-border bg-background h-11 rounded-md border px-3"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Meeting type
                <select
                  name="meetingType"
                  defaultValue="weekly_executive_review"
                  className="border-border bg-background h-11 rounded-md border px-3"
                >
                  {MEETING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {meetingTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Starts at
                <input
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultStart()}
                  className="border-border bg-background h-11 rounded-md border px-3"
                />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold">Project scope</legend>
              <p className="text-muted mt-1 text-xs">
                Leave all unchecked to include every project you can access.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {forecast.projects.map((project) => (
                  <label
                    key={project.id}
                    className="border-border flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="projectId"
                      value={project.id}
                      className="size-4"
                    />
                    {project.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="bg-deep-green inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-5 text-sm font-semibold text-white">
              <CalendarCheck2 className="size-4" aria-hidden="true" />
              Generate agenda
            </button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-muted text-sm">
            Your role can review meeting records but cannot create decisions or
            follow-up work.
          </p>
        </Card>
      )}

      <section aria-labelledby="meeting-history">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="meeting-history" className="text-xl font-semibold">
              Meeting records
            </h2>
            <p className="text-muted mt-1 text-sm">
              Draft, active, and completed reviews in your accessible project
              scope.
            </p>
          </div>
        </div>
        {meetings.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {meetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="border-border bg-surface hover:border-deep-green/40 rounded-lg border p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{meeting.title}</p>
                    <p className="text-muted mt-1 text-sm">
                      {
                        meetingTypeLabels[
                          meeting.meeting_type as keyof typeof meetingTypeLabels
                        ]
                      }
                    </p>
                  </div>
                  <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                    {meeting.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-muted mt-4 flex items-center gap-2 text-xs">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {formatDate(meeting.starts_at)} · {meeting.project_ids.length}{" "}
                  projects
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="mt-4 text-center">
            <h3 className="font-semibold">No meeting records yet</h3>
            <p className="text-muted mt-2 text-sm">
              Configure the first meeting to generate an evidence-linked agenda.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

function defaultStart() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
