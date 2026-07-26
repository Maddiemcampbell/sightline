"use client";

import { Send, Sparkles } from "lucide-react";

import {
  useDashboardState,
  useQuickAsk,
} from "@/features/workspace/workspace-provider";
import { advisorModeLabels } from "@/features/workspace/advisor-selector";
import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";
import { useWorkspaceResources } from "@/features/workspace/workspace-provider";

export function QuickAskComposer() {
  const { advisorMode, selectedProjectId } = useDashboardState();
  const { quickAskDraft, setQuickAskDraft, stateReady } = useQuickAsk();
  const { canUseAi } = useWorkspaceResources();
  const { ask, pending } = useSharedAsk();
  return (
    <section
      aria-label="Quick Ask Sightline"
      className="border-border bg-soft-green/95 sticky bottom-0 z-30 border-t px-[var(--page-gutter)] py-3 backdrop-blur"
    >
      <form
        className="mx-auto flex max-w-[96rem] flex-col gap-2 lg:flex-row lg:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          const question = quickAskDraft.trim();
          if (question.length < 3 || pending || !canUseAi) return;
          ask(question);
          setQuickAskDraft("");
        }}
      >
        <div className="text-deep-green flex shrink-0 items-center gap-2 text-xs font-semibold">
          <Sparkles className="size-4" aria-hidden="true" />
          Quick Ask
        </div>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Draft a question for Ask Sightline</span>
          <input
            value={quickAskDraft}
            disabled={!stateReady || !canUseAi || pending}
            onChange={(event) => setQuickAskDraft(event.target.value)}
            placeholder={`Draft a question for your ${advisorModeLabels[advisorMode]}…`}
            className="border-border bg-surface h-10 w-full rounded-md border px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={
            !stateReady ||
            !canUseAi ||
            pending ||
            quickAskDraft.trim().length < 3
          }
          aria-describedby="quick-ask-status"
          className="bg-deep-green inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Send className="size-3.5" aria-hidden="true" />
          Ask
        </button>
      </form>
      <p
        id="quick-ask-status"
        className="text-muted mx-auto mt-1 max-w-[96rem] text-right text-[0.62rem]"
      >
        {canUseAi
          ? pending
            ? "Reviewing authorized evidence…"
            : "Draft preserved · Responses use authorized organization data"
          : "Ask Sightline is not available for your organization role"}
        {selectedProjectId === "all" ? "" : " · Project context selected"}
      </p>
    </section>
  );
}
