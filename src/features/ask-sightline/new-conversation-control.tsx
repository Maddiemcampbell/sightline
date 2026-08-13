"use client";

import { MessageSquarePlus } from "lucide-react";

export function NewConversationControl({
  hasConversation,
  onStart,
  compact = false,
}: {
  hasConversation: boolean;
  onStart: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={
        hasConversation
          ? "Start a new conversation and keep this one in history"
          : "Start a new conversation"
      }
      className={
        compact
          ? "border-border bg-surface hover:bg-background inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
          : "bg-deep-green hover:bg-deep-green/90 inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white shadow-sm"
      }
    >
      <MessageSquarePlus className="size-4" aria-hidden="true" />
      {compact ? "New" : "Start new conversation"}
    </button>
  );
}
