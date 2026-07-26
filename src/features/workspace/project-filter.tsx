"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  useDashboardState,
  useWorkspaceResources,
} from "@/features/workspace/workspace-provider";

export function ProjectFilter() {
  const { projects } = useWorkspaceResources();
  const { selectedProjectId, setSelectedProjectId, stateReady } =
    useDashboardState();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = projects.find((project) => project.id === selectedProjectId);
  const filtered = projects.filter((project) =>
    project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={!stateReady}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-h-9 min-w-40 items-center justify-between gap-3 rounded-md border px-3 text-xs font-semibold ${
          selected
            ? "border-accent-strong bg-accent/35 text-deep-green"
            : "border-border bg-surface"
        }`}
      >
        <span className="max-w-44 truncate">
          {stateReady
            ? (selected?.name ?? `All accessible projects (${projects.length})`)
            : "Loading projects…"}
        </span>
        <ChevronDown className="text-muted size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div className="border-border bg-surface shadow-surface absolute top-11 right-0 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-lg border p-2 shadow-xl">
          <label className="relative block">
            <span className="sr-only">Search accessible projects</span>
            <Search className="text-muted absolute top-2.5 left-3 size-4" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border-border h-9 w-full rounded-md border pr-3 pl-9 text-xs"
              placeholder="Search projects…"
            />
          </label>
          <div
            role="listbox"
            aria-label="Dashboard project"
            className="mt-2 max-h-64 overflow-y-auto"
          >
            <ProjectOption
              id="all"
              name={`All accessible projects (${projects.length})`}
              selected={selectedProjectId === "all"}
              select={() => {
                setSelectedProjectId("all");
                setOpen(false);
              }}
            />
            {filtered.map((project) => (
              <ProjectOption
                key={project.id}
                id={project.id}
                name={project.name}
                selected={selectedProjectId === project.id}
                select={() => {
                  setSelectedProjectId(project.id);
                  setOpen(false);
                }}
              />
            ))}
            {!filtered.length && (
              <p className="text-muted px-3 py-6 text-center text-xs">
                No accessible projects match.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectOption({
  id,
  name,
  selected,
  select,
}: {
  id: string;
  name: string;
  selected: boolean;
  select: () => void;
}) {
  return (
    <button
      id={`project-filter-${id}`}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={select}
      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs ${
        selected
          ? "bg-accent/35 text-deep-green font-semibold"
          : "hover:bg-background"
      }`}
    >
      <span className="truncate">{name}</span>
      {selected && <Check className="text-deep-green size-4 shrink-0" />}
    </button>
  );
}
