"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Database,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MarkdownContent } from "@/components/markdown-content";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { AdvisorSelector } from "@/features/workspace/advisor-selector";
import { advisorModeLabels } from "@/features/workspace/advisor-selector";
import { ProjectFilter } from "@/features/workspace/project-filter";
import { getSuggestedOrganizationPrompts } from "@/features/ask-sightline/suggested-prompts";
import { AskCommandPalette } from "@/features/ask-sightline/command-palette";
import {
  askCommands,
  matchingAskCommands,
  resolveAskCommand,
  type AskCommand,
} from "@/features/ask-sightline/commands";
import { NewConversationControl } from "@/features/ask-sightline/new-conversation-control";
import { RichResponse } from "@/features/ask-sightline/rich-response";
import { useSharedAsk } from "@/features/ask-sightline/shared-ask-provider";
import type { SharedAskMessage } from "@/features/ask-sightline/shared-types";
import {
  useDashboardState,
  useWorkspaceResources,
} from "@/features/workspace/workspace-provider";

export function AskSightlineWorkspace() {
  const {
    messages,
    conversations,
    activeConversationId,
    ask,
    clearConversation,
    selectConversation,
    deleteConversation,
    pending,
    error,
    retryQuestion,
    ready,
  } = useSharedAsk();
  const { advisorMode, selectedProjectId, setAdvisorMode } =
    useDashboardState();
  const { projects, canUseAi } = useWorkspaceResources();
  const [question, setQuestion] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const prompts = getSuggestedOrganizationPrompts({
    advisorMode,
    pathname: "/ask",
    selectedProjectName: selectedProject?.name ?? null,
    hasPortfolioObservations: false,
    hasRecentActivity: true,
  });
  const commandMatches = matchingAskCommands(question);

  useEffect(() => {
    if (messages.length || pending)
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, pending]);

  useEffect(() => {
    function focusCommands(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !editing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setQuestion("/");
        setActiveCommandIndex(0);
        composerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusCommands);
    return () => window.removeEventListener("keydown", focusCommands);
  }, []);

  function submit(value: string) {
    const resolved = resolveAskCommand(value);
    if (resolved.question.length < 3 || pending || !canUseAi) return;
    if (resolved.advisorMode) setAdvisorMode(resolved.advisorMode);
    ask(resolved.question, {
      openDrawer: false,
      ...(resolved.advisorMode ? { advisorMode: resolved.advisorMode } : {}),
      ...(resolved.workflowCommand
        ? { workflowCommand: resolved.workflowCommand }
        : {}),
    });
    setQuestion("");
  }

  function selectCommand(command: AskCommand) {
    setQuestion(`${command.token} `);
    setAdvisorMode(command.advisorMode);
    setActiveCommandIndex(0);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  return (
    <div className="mx-auto max-w-[96rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <PageHeader
        eyebrow="AI workspace"
        title="Ask Sightline"
        description="Explore your portfolio with answers grounded in the records you are authorized to see. Every supported answer shows its sources and evidence limitations."
      />

      <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden p-0">
          <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div>
              <p className="font-semibold">Your conversation</p>
              <p className="text-muted mt-0.5 text-xs">
                Ask a follow-up, or start fresh with a new topic.
              </p>
            </div>
            <NewConversationControl
              hasConversation={messages.length > 0}
              onStart={() => {
                clearConversation();
                setQuestion("");
                requestAnimationFrame(() => composerRef.current?.focus());
              }}
            />
          </div>
          <div className="border-border bg-background/60 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-6">
            <p className="text-muted text-xs font-semibold tracking-wide uppercase">
              Answer settings
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <AdvisorSelector />
              <ProjectFilter />
            </div>
          </div>

          <div className="min-h-[34rem] px-5 py-6 sm:px-6">
            {!ready ? (
              <p role="status" className="text-muted py-24 text-center text-sm">
                Loading your conversation…
              </p>
            ) : !messages.length ? (
              <EmptyConversation
                prompts={prompts}
                onAsk={submit}
                disabled={!canUseAi}
              />
            ) : (
              <div aria-live="polite" className="mx-auto max-w-4xl space-y-5">
                {messages.map((message) =>
                  message.role === "user" ? (
                    <div
                      key={message.id}
                      className="bg-deep-green ml-auto max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 text-white sm:max-w-[75%]"
                    >
                      {message.content}
                    </div>
                  ) : (
                    <WorkspaceAnswer
                      key={message.id}
                      message={message}
                      onAsk={submit}
                    />
                  ),
                )}
                {pending ? (
                  <div role="status" className="flex items-center gap-3 py-2">
                    <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-full">
                      <Sparkles className="size-4" aria-hidden="true" />
                    </span>
                    <p className="text-muted text-sm">
                      Reviewing authorized records and checking support…
                    </p>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>
            )}

            {error ? (
              <div
                role="alert"
                className="bg-soft-red text-danger mx-auto mt-5 max-w-4xl rounded-lg p-4 text-sm"
              >
                <p>{error}</p>
                {retryQuestion ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => submit(retryQuestion)}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Retry
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <form
            className="border-border bg-surface border-t p-4 sm:p-5"
            onSubmit={(event) => {
              event.preventDefault();
              submit(question);
            }}
          >
            <div className="relative mx-auto flex max-w-4xl items-end gap-3">
              <AskCommandPalette
                commands={commandMatches}
                activeIndex={activeCommandIndex}
                onSelect={selectCommand}
              />
              <label className="min-w-0 flex-1">
                <span className="sr-only">Ask Sightline a question</span>
                <textarea
                  ref={composerRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (commandMatches.length && event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveCommandIndex(
                        (current) => (current + 1) % commandMatches.length,
                      );
                      return;
                    }
                    if (commandMatches.length && event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveCommandIndex(
                        (current) =>
                          (current - 1 + commandMatches.length) %
                          commandMatches.length,
                      );
                      return;
                    }
                    if (commandMatches.length && event.key === "Escape") {
                      event.preventDefault();
                      setQuestion("");
                      return;
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (commandMatches[activeCommandIndex]) {
                        selectCommand(commandMatches[activeCommandIndex]);
                        return;
                      }
                      submit(question);
                    }
                  }}
                  disabled={!ready || pending || !canUseAi}
                  rows={3}
                  maxLength={800}
                  placeholder={
                    advisorMode === "forecast"
                      ? "Ask about outlook, cash flow, confidence, or missing forecast inputs…"
                      : "Ask about risks, projects, actions, documents, or recent changes…"
                  }
                  role="combobox"
                  aria-expanded={commandMatches.length > 0}
                  aria-controls="ask-command-palette"
                  aria-activedescendant={
                    commandMatches[activeCommandIndex]
                      ? `ask-command-${activeCommandIndex}`
                      : undefined
                  }
                  className="border-border bg-background block w-full resize-none rounded-lg border p-3 text-sm leading-6"
                />
              </label>
              <button
                type="submit"
                aria-label="Send question"
                disabled={
                  !ready || pending || !canUseAi || question.trim().length < 3
                }
                className="bg-deep-green grid size-11 shrink-0 place-items-center rounded-md text-white disabled:opacity-50"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="text-muted mx-auto mt-2 max-w-4xl text-xs">
              Type / for commands · Enter to send · Shift+Enter for a new line ·
              Verify cited records before acting
            </p>
          </form>
        </Card>

        <aside
          aria-label="Ask Sightline context"
          className="space-y-5 xl:sticky xl:top-24"
        >
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="text-deep-green size-4"
                aria-hidden="true"
              />
              <h2 className="font-semibold">Current scope</h2>
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-muted text-xs">Projects</dt>
                <dd className="mt-1 font-semibold">
                  {selectedProject?.name ??
                    `All accessible (${projects.length})`}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Advisor</dt>
                <dd className="mt-1 font-semibold">
                  {advisorMode === "forecast"
                    ? "Forecast Advisor"
                    : advisorMode === "auto"
                      ? "Automatic routing"
                      : advisorModeLabels[advisorMode]}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs">Access boundary</dt>
                <dd className="mt-1 font-semibold">
                  Your organization permissions
                </dd>
              </div>
            </dl>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Ask commands</h2>
              <Link
                href="/help/shortcuts#ask-sightline-commands"
                className="text-deep-green text-xs font-semibold hover:underline"
              >
                View all
              </Link>
            </div>
            <p className="text-muted mt-2 text-xs leading-5">
              Type{" "}
              <kbd className="border-border rounded border px-1.5 py-0.5">
                /
              </kbd>{" "}
              in the composer to choose an advisor or start a workflow.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {askCommands.slice(0, 6).map((command) => (
                <button
                  key={command.token}
                  type="button"
                  onClick={() => selectCommand(command)}
                  className="border-border hover:bg-background rounded-md border px-2 py-2 text-left"
                >
                  <code className="text-deep-green text-xs font-semibold">
                    {command.token}
                  </code>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Database className="text-deep-green size-4" aria-hidden="true" />
              <h2 className="font-semibold">How answers work</h2>
            </div>
            <ul className="text-muted mt-4 space-y-3 text-sm leading-5">
              <li className="flex gap-2">
                <CheckCircle2 className="text-deep-green mt-0.5 size-4 shrink-0" />
                Searches authorized Sightline records.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="text-deep-green mt-0.5 size-4 shrink-0" />
                Links claims back to supporting sources.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="text-deep-green mt-0.5 size-4 shrink-0" />
                Calls out gaps instead of filling them in.
              </li>
            </ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquareText
                  className="text-deep-green size-4"
                  aria-hidden="true"
                />
                <h2 className="font-semibold">Conversation history</h2>
              </div>
              <span className="text-muted text-xs">{conversations.length}</span>
            </div>
            {conversations.length ? (
              <ul className="mt-4 space-y-2">
                {conversations.slice(0, 8).map((conversation) => {
                  const active = conversation.id === activeConversationId;
                  return (
                    <li
                      key={conversation.id}
                      className={`group flex items-stretch rounded-lg border transition-colors ${
                        active
                          ? "border-accent-strong bg-soft-green"
                          : "border-border hover:bg-background"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectConversation(conversation.id)}
                        aria-current={active ? "true" : undefined}
                        className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      >
                        <span className="block truncate text-sm font-semibold">
                          {conversation.title}
                        </span>
                        <span className="text-muted mt-1 flex items-center gap-1 text-[0.7rem]">
                          <Clock3 className="size-3" aria-hidden="true" />
                          {formatConversationTime(
                            conversation.updatedAt,
                          )} · {advisorModeLabels[conversation.advisorMode]}
                          {conversation.selectedProjectId !== "all"
                            ? ` · ${projects.find((project) => project.id === conversation.selectedProjectId)?.name ?? "Selected project"}`
                            : " · All projects"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteConversation(conversation.id)}
                        aria-label={`Delete conversation: ${conversation.title}`}
                        className="text-muted hover:text-danger hover:bg-soft-red my-1.5 mr-1.5 grid size-8 shrink-0 place-items-center rounded-md"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="bg-background mt-4 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold">No conversations yet</p>
                <p className="text-muted mt-1 text-xs leading-5">
                  Your first question will appear here automatically.
                </p>
              </div>
            )}
            <p className="text-muted mt-3 text-[0.68rem] leading-4">
              Recent conversations are saved privately in this browser.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function formatConversationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function EmptyConversation({
  prompts,
  onAsk,
  disabled,
}: {
  prompts: readonly string[];
  onAsk: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl py-10 text-center sm:py-16">
      <span className="bg-soft-green text-deep-green mx-auto grid size-12 place-items-center rounded-xl">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">
        What would you like to understand?
      </h2>
      <p className="text-muted mx-auto mt-2 max-w-xl text-sm leading-6">
        Start with a question below, or ask your own. Sightline stays within the
        selected project scope and your permissions.
      </p>
      <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onAsk(prompt)}
            className="border-border hover:border-accent-strong hover:bg-soft-green rounded-lg border p-4 text-sm leading-5 font-semibold transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkspaceAnswer({
  message,
  onAsk,
}: {
  message: SharedAskMessage;
  onAsk: (prompt: string) => void;
}) {
  return (
    <article aria-label="Sightline answer" className="max-w-4xl">
      <div className="flex items-center gap-2">
        <span className="bg-soft-green text-deep-green grid size-8 place-items-center rounded-full">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </span>
        <p className="text-deep-green text-xs font-semibold uppercase">
          Sightline analyst
        </p>
        {message.routedAdvisorMode ? (
          <span className="bg-background text-muted rounded-full px-2 py-1 text-[0.65rem] font-semibold">
            {advisorModeLabels[message.routedAdvisorMode]}
          </span>
        ) : null}
        {message.confidence !== null ? (
          <span className="text-muted ml-auto text-xs">
            {message.confidence}% confidence
          </span>
        ) : null}
      </div>
      <div className="pl-10">
        <MarkdownContent content={message.content} />
        <RichResponse message={message} />
        {message.citations.length ? (
          <section aria-label="Sources used" className="mt-5">
            <p className="text-muted flex items-center gap-2 text-xs font-semibold uppercase">
              <BookOpen className="size-3.5" aria-hidden="true" /> Sources used
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {message.citations.map((citation) => (
                <Link
                  key={citation.id}
                  href={citation.href}
                  className="border-border hover:border-accent-strong rounded-lg border p-3 transition-colors"
                >
                  <span className="text-muted text-[0.65rem] font-semibold uppercase">
                    {citation.entityType}
                  </span>
                  <span className="mt-1 flex items-start justify-between gap-2 text-sm font-semibold">
                    {citation.title}
                    <ArrowUpRight
                      className="text-muted size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-muted mt-1 line-clamp-2 text-xs leading-5">
                    {citation.excerpt}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {message.missingInformation.length ? (
          <section className="bg-soft-amber mt-4 rounded-lg p-3">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle
                className="text-warning size-4"
                aria-hidden="true"
              />{" "}
              Evidence limitations
            </p>
            <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
              {message.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {message.workflowProposal ? (
          <section
            aria-label="Workflow preview"
            className="border-accent-strong bg-soft-green mt-5 rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-deep-green text-xs font-semibold tracking-wide uppercase">
                Preview · Not applied
              </p>
              <code className="text-muted text-xs">
                {message.workflowProposal.command}
              </code>
            </div>
            <h3 className="mt-3 font-semibold">
              {message.workflowProposal.title}
            </h3>
            <p className="mt-1 text-sm leading-6">
              {message.workflowProposal.summary}
            </p>
            <p className="text-muted mt-3 text-xs leading-5">
              {message.workflowProposal.effect}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={message.workflowProposal.href}
                className="bg-deep-green inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
              >
                {message.workflowProposal.actionLabel}
              </Link>
              <span className="text-muted text-xs">
                You will review required details before anything changes.
              </span>
            </div>
          </section>
        ) : null}
        {message.suggestedFollowUps.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.suggestedFollowUps.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onAsk(prompt)}
                className="border-border hover:bg-background rounded-md border px-3 py-2 text-left text-xs font-semibold"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
