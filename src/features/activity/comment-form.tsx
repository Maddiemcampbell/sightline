"use client";

import { useMemo, useState, useTransition } from "react";

import { addRiskCommentAction } from "@/app/risks/[riskId]/actions";
import { PrimaryButton } from "@/components/ui/button";
import type { Collaborator } from "@/features/collaboration/types";

export function RiskCommentForm({
  riskId,
  users,
}: {
  riskId: string;
  users: readonly Collaborator[];
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mentionQuery = /(?:^|\s)@([a-z0-9._-]*)$/i.exec(comment)?.[1] ?? null;
  const suggestions = useMemo(
    () =>
      mentionQuery === null
        ? []
        : users
            .filter((user) =>
              `${user.username} ${user.name}`
                .toLowerCase()
                .includes(mentionQuery.toLowerCase()),
            )
            .slice(0, 6),
    [mentionQuery, users],
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await addRiskCommentAction({ riskId, bodyMarkdown: comment });
            setComment("");
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Comment could not be added.",
            );
          }
        });
      }}
      className="bg-background mb-6 rounded-lg border p-4"
    >
      <label className="text-sm font-semibold">
        Add a comment
        <textarea
          aria-label="Comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Use Markdown and type @ to mention a teammate"
          required
          maxLength={10_000}
          rows={4}
          className="border-border bg-surface mt-2 block w-full rounded-md border p-3 font-normal"
        />
      </label>
      {suggestions.length > 0 && (
        <div
          className="border-border bg-surface mt-1 rounded-md border p-1"
          role="listbox"
          aria-label="Mention suggestions"
        >
          {suggestions.map((user) => (
            <button
              key={user.membershipId}
              type="button"
              role="option"
              aria-selected="false"
              className="hover:bg-background flex w-full items-center gap-2 rounded p-2 text-left text-sm"
              onClick={() =>
                setComment((current) =>
                  current.replace(/@([a-z0-9._-]*)$/i, `@${user.username} `),
                )
              }
            >
              <Avatar person={user} />
              <span>
                <strong>{user.name}</strong>
                <span className="text-muted ml-2">@{user.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-muted text-xs">
          Markdown supported: **bold**, _italic_, `code`, and links.
        </p>
        <PrimaryButton
          type="submit"
          disabled={pending || comment.trim().length < 1}
        >
          {pending ? "Adding…" : "Comment"}
        </PrimaryButton>
      </div>
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}

export function Avatar({
  person,
  size = "sm",
}: {
  person: Pick<Collaborator, "name" | "avatarUrl">;
  size?: "sm" | "md";
}) {
  const initials = person.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const classes = size === "md" ? "size-9" : "size-7";
  return person.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={person.avatarUrl}
      alt=""
      className={`${classes} rounded-full object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`bg-soft-green text-deep-green grid ${classes} shrink-0 place-items-center rounded-full text-[10px] font-bold`}
    >
      {initials}
    </span>
  );
}
