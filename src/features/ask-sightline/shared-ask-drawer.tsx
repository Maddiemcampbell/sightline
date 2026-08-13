"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { MarkdownContent } from "@/components/markdown-content";
import { getSuggestedOrganizationPrompts } from "@/features/ask-sightline/suggested-prompts";
import { NewConversationControl } from "@/features/ask-sightline/new-conversation-control";
import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";
import {
  useDashboardState,
  useQuickAsk,
  useWorkspaceResources,
} from "@/features/workspace/workspace-provider";

export function SharedAskDrawer() {
  const {
    messages,
    ask,
    clearConversation,
    open,
    setOpen,
    pending,
    error,
    retryQuestion,
    ready,
  } = useSharedAsk();
  const { advisorMode, selectedProjectId } = useDashboardState();
  const { projects, canUseAi } = useWorkspaceResources();
  const { quickAskDraft, setQuickAskDraft, stateReady } = useQuickAsk();
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const prompts = getSuggestedOrganizationPrompts({
    advisorMode,
    pathname,
    selectedProjectName: selectedProject?.name ?? null,
    hasPortfolioObservations: false,
  });

  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", escape);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => document.removeEventListener("keydown", escape);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-[#071f19]/35"
        aria-hidden="true"
        onMouseDown={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ask Sightline conversation"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const focusable = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            ),
          );
          const first = focusable[0];
          const last = focusable.at(-1);
          if (event.shiftKey && document.activeElement === first && last) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            document.activeElement === last &&
            first
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
        className="border-border bg-surface fixed inset-y-0 right-0 z-[90] flex w-full max-w-[32rem] flex-col border-l shadow-2xl"
      >
        <header className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-deep-green size-5" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Ask Sightline</h2>
              <p className="text-muted text-xs">
                Authorized organization context
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NewConversationControl
              compact
              hasConversation={messages.length > 0}
              onStart={clearConversation}
            />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted hover:bg-background grid size-9 place-items-center rounded-md"
              aria-label="Close Ask Sightline"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!ready ? (
            <p role="status" className="text-muted py-12 text-center text-sm">
              Loading conversation…
            </p>
          ) : !messages.length ? (
            <div className="py-8">
              <h3 className="text-lg font-semibold">
                Ask about your authorized portfolio
              </h3>
              <p className="text-muted mt-2 text-sm leading-6">
                Answers use available projects, risks, actions, documents,
                evidence, activity, resolutions, and deterministic portfolio
                observations.
              </p>
              <div className="mt-6 space-y-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => ask(prompt)}
                    className="border-border hover:bg-background w-full rounded-lg border p-3 text-left text-sm font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div aria-live="polite" className="space-y-4">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    className="bg-deep-green ml-auto max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 text-white"
                  >
                    {message.content}
                  </div>
                ) : (
                  <section
                    key={message.id}
                    aria-label="Sightline organization answer"
                    className="border-border rounded-xl border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-deep-green text-xs font-semibold uppercase">
                        Sightline analyst
                      </p>
                      {message.confidence !== null && (
                        <span className="text-muted text-xs">
                          {message.confidence}% confidence
                        </span>
                      )}
                    </div>
                    <MarkdownContent content={message.content} />
                    {message.citations.length > 0 && (
                      <div className="border-border mt-4 border-t pt-3">
                        <p className="text-muted text-[0.68rem] font-semibold uppercase">
                          Authorized sources
                        </p>
                        <ul className="mt-2 space-y-1">
                          {message.citations.map((citation) => (
                            <li key={citation.id}>
                              <Link
                                href={citation.href}
                                onClick={() => setOpen(false)}
                                className="text-deep-green text-xs font-semibold hover:underline"
                              >
                                {citation.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {message.missingInformation.length > 0 && (
                      <div className="bg-background mt-4 rounded-lg p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold">
                          <AlertTriangle
                            className="size-4"
                            aria-hidden="true"
                          />
                          Evidence limitations
                        </p>
                        <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-xs">
                          {message.missingInformation.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {message.suggestedFollowUps.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.suggestedFollowUps.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            disabled={pending}
                            onClick={() => ask(prompt)}
                            className="border-border rounded-md border px-2.5 py-2 text-left text-xs font-semibold"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                ),
              )}
              {pending && (
                <p role="status" className="text-muted text-sm">
                  Sightline is reviewing authorized portfolio evidence…
                </p>
              )}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="bg-soft-red text-danger mt-4 rounded-lg p-4 text-sm"
            >
              <p>{error}</p>
              {retryQuestion && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => ask(retryQuestion)}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
        <form
          className="border-border bg-surface border-t p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const question = quickAskDraft.trim();
            if (question.length < 3 || pending || !canUseAi) return;
            ask(question);
            setQuickAskDraft("");
          }}
        >
          <label className="text-xs font-semibold">
            Ask a follow-up
            <textarea
              value={quickAskDraft}
              onChange={(event) => setQuickAskDraft(event.target.value)}
              disabled={!stateReady || pending || !canUseAi}
              rows={2}
              maxLength={800}
              placeholder="Ask from authorized organization data…"
              className="border-border bg-surface mt-2 block w-full resize-none rounded-lg border p-3 text-sm font-normal"
            />
          </label>
          <button
            type="submit"
            disabled={
              !stateReady ||
              pending ||
              !canUseAi ||
              quickAskDraft.trim().length < 3
            }
            className="bg-deep-green mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md px-4 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Reviewing evidence…" : "Ask Sightline"}
          </button>
        </form>
        <p className="text-muted border-border border-t px-5 py-3 text-center text-[0.65rem] leading-4">
          Sightline may be incomplete. Verify cited records before acting.
        </p>
      </aside>
    </>
  );
}
