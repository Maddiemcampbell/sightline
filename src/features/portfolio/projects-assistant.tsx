"use client";

import { Bot, Sparkles } from "lucide-react";

import { AdvisorSelector } from "@/features/workspace/advisor-selector";
import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";

const prompts = [
  "Which projects have the highest risk?",
  "Show me projects trending over budget.",
  "Which projects need executive attention?",
  "Compare projects with similar risk patterns.",
];

export function ProjectsAssistant() {
  const { ask, setOpen, pending } = useSharedAsk();
  return (
    <aside
      aria-label="Projects AI assistant"
      className="dashboard-card sticky top-4 hidden p-4 min-[112rem]:block"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-deep-green size-4" />
        <h2 className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
          AI assistant
        </h2>
      </div>
      <div className="mt-4">
        <AdvisorSelector />
      </div>
      <span className="bg-accent/35 text-deep-green mt-5 grid size-10 place-items-center rounded-full">
        <Bot aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold">Analyze your project portfolio</h3>
      <p className="text-muted mt-2 text-xs leading-5">
        Ask about health, supported financial exposure, schedule, and project
        risk using only information you are authorized to access.
      </p>
      <p className="text-muted mt-6 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase">
        Suggested prompts
      </p>
      <div className="mt-2 space-y-2">
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
        className="bg-deep-green hover:bg-ink mt-5 min-h-10 w-full rounded-md px-3 text-xs font-semibold text-white"
      >
        Open organization assistant
      </button>
      <p className="text-muted mt-4 text-center text-[0.6875rem] leading-4">
        AI can make mistakes. Verify important information using supplied
        citations and source records.
      </p>
    </aside>
  );
}
