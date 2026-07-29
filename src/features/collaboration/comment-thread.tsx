"use client";

import { useState, useTransition } from "react";

import {
  deleteRiskCommentAction,
  editRiskCommentAction,
  toggleRiskCommentReactionAction,
} from "@/app/risks/[riskId]/actions";
import { Avatar } from "@/features/activity/comment-form";
import type {
  CollaborationComment,
  CommentReaction,
} from "@/features/collaboration/types";

const reactionLabels: Record<CommentReaction, string> = {
  like: "👍",
  celebrate: "🎉",
  eyes: "👀",
  resolved: "✅",
};

export function CommentThread({
  riskId,
  comments,
}: {
  riskId: string;
  comments: readonly CollaborationComment[];
}) {
  if (!comments.length)
    return <p className="text-muted text-sm">No comments yet.</p>;
  return (
    <ol className="space-y-4" aria-label="Comments">
      {comments.map((comment) => (
        <CommentItem key={comment.id} riskId={riskId} comment={comment} />
      ))}
    </ol>
  );
}

function CommentItem({
  riskId,
  comment,
}: {
  riskId: string;
  comment: CollaborationComment;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.bodyMarkdown);
  const [pending, startTransition] = useTransition();
  return (
    <li className="border-border rounded-lg border p-4">
      <div className="flex gap-3">
        <Avatar person={comment.author} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{comment.author.name}</strong>
            <span className="text-muted text-xs">
              @{comment.author.username}
            </span>
            <time className="text-muted text-xs">
              {new Date(comment.createdAt).toLocaleString()}
            </time>
            {comment.editedAt && (
              <span
                className="text-muted text-xs"
                title="Edit history retained"
              >
                edited
              </span>
            )}
          </div>
          {editing ? (
            <form
              className="mt-2"
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  await editRiskCommentAction({
                    riskId,
                    commentId: comment.id,
                    bodyMarkdown: body,
                  });
                  setEditing(false);
                });
              }}
            >
              <textarea
                aria-label="Edit comment"
                className="border-border bg-surface w-full rounded-md border p-2 text-sm"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button className="text-deep-green text-xs font-semibold">
                  {pending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="text-muted text-xs"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <MarkdownText
              markdown={
                comment.deletedAt ? "_Comment deleted._" : comment.bodyMarkdown
              }
            />
          )}
          {!comment.deletedAt && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(Object.keys(reactionLabels) as CommentReaction[]).map(
                (reaction) => (
                  <button
                    key={reaction}
                    type="button"
                    aria-label={`${reaction} reaction`}
                    aria-pressed={comment.reactedByMe.includes(reaction)}
                    className={`rounded-full border px-2 py-1 text-xs ${comment.reactedByMe.includes(reaction) ? "bg-soft-green border-deep-green" : "border-border"}`}
                    onClick={() =>
                      startTransition(() =>
                        toggleRiskCommentReactionAction({
                          riskId,
                          commentId: comment.id,
                          reaction,
                        }),
                      )
                    }
                  >
                    {reactionLabels[reaction]}{" "}
                    {comment.reactions[reaction] || ""}
                  </button>
                ),
              )}
              {comment.canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-muted ml-2 text-xs font-semibold"
                >
                  Edit
                </button>
              )}
              {comment.canDelete && (
                <button
                  type="button"
                  className="text-danger text-xs font-semibold"
                  onClick={() => {
                    if (!window.confirm("Delete this comment?")) return;
                    startTransition(() =>
                      deleteRiskCommentAction({
                        riskId,
                        commentId: comment.id,
                      }),
                    );
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function MarkdownText({ markdown }: { markdown: string }) {
  return (
    <div className="mt-2 space-y-2 text-sm leading-6">
      {markdown.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>
          {paragraph.split("\n").map((line, lineIndex) => (
            <span key={lineIndex}>
              {renderInlineMarkdown(line)}
              {lineIndex < paragraph.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|@[a-z0-9._-]+)/gi);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_"))
      return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={index} className="bg-background rounded px-1">
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("@"))
      return (
        <strong key={index} className="text-deep-green">
          {part}
        </strong>
      );
    return part;
  });
}
