"use client";

import { CalendarCheck2, Check, UsersRound } from "lucide-react";
import { useState } from "react";

import { createMeetingAction } from "@/app/meetings/actions";
import { meetingTypeLabels, MEETING_TYPES } from "@/features/meetings/types";

type Project = Readonly<{ id: string; name: string }>;

export function MeetingConfigurator({
  projects,
}: {
  projects: readonly Project[];
}) {
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const projectCount = scope === "all" ? projects.length : selected.length;

  return (
    <form action={createMeetingAction} className="mt-6 grid gap-6">
      <ol
        aria-label="Meeting preparation steps"
        className="grid gap-2 text-sm sm:grid-cols-3"
      >
        {[
          ["1", "Choose meeting and scope"],
          ["2", "Review generated agenda"],
          ["3", "Facilitate and follow up"],
        ].map(([number, label], index) => (
          <li
            key={number}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 ${index === 0 ? "border-deep-green bg-soft-green text-deep-green" : "border-border text-muted"}`}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold">
              {number}
            </span>
            <span className="font-semibold">{label}</span>
          </li>
        ))}
      </ol>

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
          Choose exactly what leadership will review. You can confirm the agenda
          before the meeting begins.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ScopeChoice
            active={scope === "all"}
            title="All accessible projects"
            detail={`${projects.length} projects in your current scope`}
            onClick={() => setScope("all")}
          />
          <ScopeChoice
            active={scope === "selected"}
            title="Selected projects"
            detail={
              selected.length
                ? `${selected.length} selected`
                : "Choose one or more projects"
            }
            onClick={() => setScope("selected")}
          />
        </div>
        {scope === "selected" ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <label
                key={project.id}
                className="border-border flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="projectId"
                  value={project.id}
                  checked={selected.includes(project.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, project.id]
                        : current.filter((id) => id !== project.id),
                    )
                  }
                  className="size-4"
                />
                {project.name}
              </label>
            ))}
          </div>
        ) : null}
        {scope === "all"
          ? projects.map((project) => (
              <input
                key={project.id}
                type="hidden"
                name="projectId"
                value={project.id}
              />
            ))
          : null}
      </fieldset>

      <div className="border-border bg-background flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-md">
            <UsersRound className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">Ready to build the agenda</p>
            <p className="text-muted text-xs">
              {projectCount} {projectCount === 1 ? "project" : "projects"} ·
              evidence-linked risks, forecasts, and commitments
            </p>
          </div>
        </div>
        <button
          disabled={projectCount === 0}
          className="bg-deep-green disabled:bg-muted inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold text-white disabled:cursor-not-allowed"
        >
          <CalendarCheck2 className="size-4" aria-hidden="true" />
          Build and review agenda
        </button>
      </div>
    </form>
  );
}

function ScopeChoice({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-20 items-center gap-3 rounded-lg border p-4 text-left ${active ? "border-deep-green bg-soft-green" : "border-border bg-surface hover:border-deep-green/40"}`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full border ${active ? "border-deep-green bg-deep-green text-white" : "border-border"}`}
      >
        {active ? <Check className="size-4" aria-hidden="true" /> : null}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-muted mt-1 block text-xs">{detail}</span>
      </span>
    </button>
  );
}

function defaultStart() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
