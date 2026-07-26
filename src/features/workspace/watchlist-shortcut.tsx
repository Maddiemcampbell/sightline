"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

import { useWatchlist } from "@/features/workspace/workspace-provider";

export function WatchlistShortcut() {
  const { watchlist } = useWatchlist();
  return (
    <Link
      href="/watchlist"
      className="focus-visible:outline-accent-strong flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Bookmark aria-hidden="true" className="size-[1.125rem]" />
      <span>My Watchlist</span>
      <span className="ml-auto min-w-5 rounded-full bg-white/10 px-1.5 py-0.5 text-center text-[0.65rem] text-white">
        {watchlist.length}
      </span>
    </Link>
  );
}
