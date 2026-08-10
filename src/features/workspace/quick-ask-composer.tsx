"use client";

import { ChevronUp, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  useDashboardState,
  useQuickAsk,
} from "@/features/workspace/workspace-provider";
import { advisorModeLabels } from "@/features/workspace/advisor-selector";
import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";
import { useWorkspaceResources } from "@/features/workspace/workspace-provider";

export function QuickAskComposer() {
  const pathname = usePathname();
  const { advisorMode, selectedProjectId } = useDashboardState();
  const { quickAskDraft, setQuickAskDraft, stateReady } = useQuickAsk();
  const { canUseAi } = useWorkspaceResources();
  const { ask, pending } = useSharedAsk();
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  if (pathname === "/ask") return null;
  return (
    <section
      aria-label="Quick Ask Sightline"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) setExpanded(false);
      }}
      className="border-border bg-soft-green/95 sticky bottom-0 z-30 border-t px-[var(--page-gutter)] py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:pt-3 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {!expanded ? (
        <button
          type="button"
          aria-label="Ask Sightline"
          aria-expanded="false"
          aria-controls="quick-ask-composer"
          onClick={() => setExpanded(true)}
          className="border-border bg-surface mx-auto flex min-h-12 w-full max-w-[96rem] items-center justify-between gap-3 rounded-lg border px-3 text-left shadow-sm lg:hidden"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="bg-soft-green text-deep-green grid size-8 shrink-0 place-items-center rounded-full">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Ask Sightline</span>
              <span className="text-muted block truncate text-xs">
                {canUseAi
                  ? `${advisorModeLabels[advisorMode]} · Tap to ask`
                  : "Not available for your organization role"}
              </span>
            </span>
          </span>
          <span className="text-deep-green flex shrink-0 items-center gap-2 text-xs font-semibold">
            {quickAskDraft.trim() ? "Draft saved" : null}
            <ChevronUp className="size-4" aria-hidden="true" />
          </span>
        </button>
      ) : null}
      <div
        id="quick-ask-composer"
        className={expanded ? "block" : "hidden lg:block"}
      >
        <div className="mx-auto mb-2 flex max-w-[96rem] items-center justify-between lg:hidden">
          <div className="text-deep-green flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" aria-hidden="true" />
            Ask Sightline
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Collapse Quick Ask"
            className="text-muted hover:bg-surface grid size-10 place-items-center rounded-md"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <form
          className="mx-auto flex max-w-[96rem] flex-col gap-2 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            const question = quickAskDraft.trim();
            if (question.length < 3 || pending || !canUseAi) return;
            ask(question);
            setQuickAskDraft("");
            setExpanded(false);
          }}
        >
          <div className="text-deep-green hidden shrink-0 items-center gap-2 text-xs font-semibold lg:flex">
            <Sparkles className="size-4" aria-hidden="true" />
            Quick Ask
          </div>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Draft a question for Ask Sightline</span>
            <input
              ref={inputRef}
              value={quickAskDraft}
              disabled={!stateReady || !canUseAi || pending}
              onChange={(event) => setQuickAskDraft(event.target.value)}
              placeholder={`Draft a question for your ${advisorModeLabels[advisorMode]}…`}
              className="border-border bg-surface h-11 w-full rounded-md border px-3 text-sm lg:h-10"
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
            className="bg-deep-green inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold text-white disabled:opacity-50 lg:min-h-10"
          >
            <Send className="size-3.5" aria-hidden="true" />
            Ask
          </button>
        </form>
        <p
          id="quick-ask-status"
          className="text-muted mx-auto mt-1 max-w-[96rem] text-right text-xs"
          aria-live="polite"
        >
          {canUseAi
            ? pending
              ? "Reviewing authorized evidence…"
              : "Draft preserved · Responses use authorized organization data"
            : "Ask Sightline is not available for your organization role"}
          {selectedProjectId === "all" ? "" : " · Project context selected"}
        </p>
      </div>
    </section>
  );
}
