"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { usePathname } from "next/navigation";

import { useWatchlist } from "@/features/workspace/workspace-provider";

export function WatchlistShortcut({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "header";
}) {
  const { watchlist } = useWatchlist();
  const pathname = usePathname();
  const active = pathname.startsWith("/watchlist");
  if (variant === "header")
    return (
      <Link
        href="/watchlist"
        aria-label={`My Watchlist, ${watchlist.length} item${watchlist.length === 1 ? "" : "s"}`}
        aria-current={active ? "page" : undefined}
        title="My Watchlist"
        className={`relative grid size-10 place-items-center rounded-md transition-colors ${
          active
            ? "bg-soft-green text-deep-green"
            : "text-muted hover:bg-background hover:text-ink"
        }`}
      >
        <Bookmark aria-hidden="true" className="size-5" />
        {watchlist.length ? (
          <span className="bg-deep-green absolute top-0.5 right-0.5 min-w-4 rounded-full px-1 text-center text-[0.6rem] leading-4 font-semibold text-white">
            {watchlist.length > 9 ? "9+" : watchlist.length}
          </span>
        ) : null}
      </Link>
    );
  return (
    <Link
      href="/watchlist"
      aria-current={active ? "page" : undefined}
      className={`focus-visible:outline-accent-strong flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-deep-green hover:bg-accent-strong"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Bookmark aria-hidden="true" className="size-[1.125rem]" />
      <span>My Watchlist</span>
      <span
        className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[0.65rem] ${
          active ? "bg-deep-green/10 text-deep-green" : "bg-white/10 text-white"
        }`}
      >
        {watchlist.length}
      </span>
    </Link>
  );
}
