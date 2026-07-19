"use client";

import { useState, useTransition } from "react";

import { addRiskCommentAction } from "@/app/risks/[riskId]/actions";
import { PrimaryButton } from "@/components/ui/button";

export function RiskCommentForm({
  riskId,
  users,
}: {
  riskId: string;
  users: readonly { id: string; full_name: string }[];
}) {
  const [comment, setComment] = useState("");
  const [mentionedUserId, setMentionedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSuccess(false);
        startTransition(async () => {
          try {
            await addRiskCommentAction({
              riskId,
              comment,
              mentionedUserId: mentionedUserId || null,
            });
            setComment("");
            setMentionedUserId("");
            setSuccess(true);
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
          required
          minLength={2}
          maxLength={3000}
          rows={3}
          className="border-border bg-surface mt-2 block w-full rounded-md border p-3 font-normal"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-muted text-xs">
          Mention a teammate
          <select
            aria-label="Mention teammate"
            value={mentionedUserId}
            onChange={(event) => setMentionedUserId(event.target.value)}
            className="border-border bg-surface mt-1 block min-h-10 rounded-md border px-3 text-sm"
          >
            <option value="">No mention</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </label>
        <PrimaryButton
          type="submit"
          disabled={pending || comment.trim().length < 2}
        >
          {pending ? "Adding…" : "Add comment"}
        </PrimaryButton>
      </div>
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-deep-green mt-3 text-sm font-semibold">
          Comment added.
        </p>
      )}
    </form>
  );
}
