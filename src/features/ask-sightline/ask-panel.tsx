"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import {
  askSightlineAction,
  rateSightlineAnswerAction,
} from "@/app/risks/[riskId]/ask-actions";
import { Card } from "@/components/ui/card";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { useDashboardState } from "@/features/workspace/workspace-provider";
import { getSuggestedRiskPrompts } from "@/features/ask-sightline/suggested-prompts";
import { MarkdownContent } from "@/components/markdown-content";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence_ids: string[];
  confidence: number | null;
  missing_information: string[];
  suggested_follow_ups: string[];
};

export function AskSightlinePanel({
  riskId,
  initialMessages,
  evidenceLabels,
}: {
  riskId: string;
  initialMessages: readonly Message[];
  evidenceLabels: Readonly<Record<string, string>>;
}) {
  const { advisorMode } = useDashboardState();
  const suggestedQuestions = getSuggestedRiskPrompts(advisorMode);
  const [messages, setMessages] = useState([...initialMessages]);
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ask(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    setError(null);
    setLastQuestion(trimmed);
    setQuestion("");
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: trimmed,
      evidence_ids: [],
      confidence: null,
      missing_information: [],
      suggested_follow_ups: [],
    };
    setMessages((current) => [...current, optimistic]);
    startTransition(async () => {
      try {
        const answer = await askSightlineAction({
          riskId,
          question: trimmed,
          advisorMode,
        });
        setMessages((current) => [
          ...current.filter((item) => item.id !== optimistic.id),
          {
            id: `user-${answer.id}`,
            role: "user",
            content: trimmed,
            evidence_ids: [],
            confidence: null,
            missing_information: [],
            suggested_follow_ups: [],
          },
          answer,
        ]);
      } catch (caught) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimistic.id),
        );
        setError(
          caught instanceof Error
            ? caught.message
            : "Sightline could not answer that question.",
        );
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <div aria-live="polite" className="space-y-5">
          {!messages.length && (
            <div className="py-8 text-center">
              <h2 className="text-xl font-semibold">Ask about this risk</h2>
              <p className="text-muted mt-2 text-sm">
                Sightline answers from cited risk evidence and clearly
                identifies gaps.
              </p>
            </div>
          )}
          {messages.map((message) =>
            message.role === "user" ? (
              <div
                key={message.id}
                className="bg-deep-green ml-auto max-w-[85%] rounded-xl px-4 py-3 text-sm leading-6 text-white"
              >
                {message.content}
              </div>
            ) : (
              <Answer
                key={message.id}
                message={message}
                evidenceLabels={evidenceLabels}
                onFollowUp={ask}
              />
            ),
          )}
          {pending && (
            <p role="status" className="text-muted text-sm">
              Sightline is reviewing the available evidence…
            </p>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="bg-soft-red text-danger mt-5 rounded-lg p-4 text-sm"
          >
            <p>{error}</p>
            <SecondaryButton className="mt-3" onClick={() => ask(lastQuestion)}>
              <RotateCcw className="size-4" /> Retry
            </SecondaryButton>
          </div>
        )}
        <form
          className="mt-6 border-t pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <label className="text-sm font-semibold">
            Question about this risk
            <textarea
              aria-label="Question about this risk"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ask a focused question…"
              className="border-border bg-surface mt-2 block w-full rounded-lg border p-3 font-normal"
            />
          </label>
          <PrimaryButton
            className="mt-3"
            type="submit"
            disabled={pending || question.trim().length < 3}
          >
            <Send className="size-4" /> Ask Sightline
          </PrimaryButton>
        </form>
      </Card>
      <aside>
        <Card>
          <h2 className="font-semibold">Suggested questions</h2>
          <div className="mt-4 space-y-2">
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                type="button"
                disabled={pending}
                onClick={() => ask(item)}
                className="border-border hover:bg-background w-full rounded-lg border p-3 text-left text-sm font-medium"
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-muted mt-5 border-t pt-4 text-xs leading-5">
            Answers are bounded to this risk and its authorized records.
            Sightline does not expose internal prompts or model reasoning.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function Answer({
  message,
  evidenceLabels,
  onFollowUp,
}: {
  message: Message;
  evidenceLabels: Readonly<Record<string, string>>;
  onFollowUp: (question: string) => void;
}) {
  const [rating, setRating] = useState<string | null>(null);
  return (
    <section
      className="border-border rounded-xl border p-4"
      aria-label="Sightline answer"
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
      {message.evidence_ids.length > 0 && (
        <div className="mt-4">
          <p className="text-muted text-xs font-semibold uppercase">
            Evidence citations
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {message.evidence_ids.map((id) => (
              <li key={id}>
                [{id.slice(0, 8)}] {evidenceLabels[id] ?? "Risk evidence"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {message.missing_information.length > 0 && (
        <div className="bg-background mt-4 rounded-lg p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase">
            <AlertTriangle className="size-4" /> Missing information
          </p>
          <ul className="text-muted mt-2 space-y-1 text-sm">
            {message.missing_information.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
      {message.suggested_follow_ups.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.suggested_follow_ups.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onFollowUp(item)}
              className="border-border rounded-md border px-2.5 py-2 text-xs font-semibold"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-muted mr-1 text-xs">Was this useful?</span>
        <FeedbackButton
          label="Helpful"
          active={rating === "helpful"}
          onClick={() => submit("helpful")}
          icon={<ThumbsUp className="size-3.5" />}
        />
        <FeedbackButton
          label="Not helpful"
          active={rating === "not_helpful"}
          onClick={() => submit("not_helpful")}
          icon={<ThumbsDown className="size-3.5" />}
        />
        <FeedbackButton
          label="Incorrect"
          active={rating === "incorrect"}
          onClick={() => submit("incorrect")}
          icon={<AlertTriangle className="size-3.5" />}
        />
      </div>
      {rating && (
        <p role="status" className="text-deep-green mt-2 text-xs font-semibold">
          Feedback saved.
        </p>
      )}
    </section>
  );
  function submit(value: "helpful" | "not_helpful" | "incorrect") {
    void rateSightlineAnswerAction({
      messageId: message.id,
      rating: value,
    }).then(() => setRating(value));
  }
}

function FeedbackButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${active ? "border-deep-green bg-soft-green text-deep-green" : "border-border"}`}
    >
      {icon}
      {label}
    </button>
  );
}
