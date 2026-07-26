"use client";

import { Bot, Sparkles } from "lucide-react";

import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";

export function ProjectDetailAssistant({
  projectName,
}: {
  projectName: string;
}) {
  const { ask, pending, setOpen } = useSharedAsk();
  const prompts = [
    `Summarize ${projectName}.`,
    `Explain why ${projectName} needs attention.`,
    `What actions should happen next on ${projectName}?`,
    `What information is missing for ${projectName}?`,
  ];

  return (
    <aside
      aria-label="Project AI advisor"
      className="dashboard-card sticky top-4 p-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-deep-green size-4" />
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          AI project advisor
        </h2>
      </div>
      <span className="bg-accent/35 text-deep-green mt-5 grid size-10 place-items-center rounded-full">
        <Bot aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold">Investigate this project</h3>
      <p className="text-muted mt-2 text-xs leading-5">
        Ask about current risks, evidence, activity, and supported financial
        exposure using only records you are authorized to access.
      </p>
      <div className="mt-5 space-y-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={pending}
            onClick={() => ask(prompt)}
            className="border-border hover:bg-background min-h-11 w-full rounded-md border px-3 py-2 text-left text-xs font-medium"
          >
            {prompt}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-deep-green mt-5 min-h-10 w-full rounded-md px-3 text-xs font-semibold text-white hover:bg-ink"
      >
        Open full conversation
      </button>
      <p className="text-muted mt-4 text-center text-[0.6875rem] leading-4">
        Verify important information using citations and source records.
      </p>
    </aside>
  );
}
