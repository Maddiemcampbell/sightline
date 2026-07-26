"use client";

import { Bookmark } from "lucide-react";

import type { WatchlistItem } from "@/features/workspace/types";
import { useWatchlist } from "@/features/workspace/workspace-provider";
import { cn } from "@/lib/utils";

export function WatchlistButton({
  item,
  className,
}: {
  item: Omit<WatchlistItem, "addedAt">;
  className?: string;
}) {
  const { isWatchlisted, toggleWatchlist, stateReady } = useWatchlist();
  const saved = isWatchlisted(item.type, item.id);
  return (
    <button
      type="button"
      disabled={!stateReady}
      onClick={() => toggleWatchlist(item)}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove" : "Add"} ${item.title} ${
        saved ? "from" : "to"
      } watchlist`}
      className={cn(
        "border-border bg-surface hover:bg-background grid size-9 shrink-0 place-items-center rounded-md border",
        className,
      )}
    >
      <Bookmark
        aria-hidden="true"
        className={cn(
          "size-4",
          saved ? "fill-deep-green text-deep-green" : "text-muted",
        )}
      />
    </button>
  );
}
