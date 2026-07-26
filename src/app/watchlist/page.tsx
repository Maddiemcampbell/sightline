"use client";

import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { useWatchlist } from "@/features/workspace/workspace-provider";

export default function WatchlistPage() {
  const { watchlist, toggleWatchlist, stateReady } = useWatchlist();
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          Personal workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          My Watchlist
        </h1>
        <p className="text-muted mt-2 max-w-2xl">
          Keep important projects, risks, and actions close at hand.
        </p>
      </header>
      {!stateReady ? (
        <Card
          className="text-muted mt-8 py-12 text-center text-sm"
          role="status"
        >
          Loading your watchlist…
        </Card>
      ) : !watchlist.length ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing on your watchlist"
            description="Use the bookmark control on a project, risk, or action to save it here."
            action={
              <Link
                href="/projects"
                className="bg-deep-green inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
              >
                Browse projects
              </Link>
            }
          />
        </div>
      ) : (
        <section aria-label="Watchlist items" className="mt-8">
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {watchlist.map((item) => (
              <li key={`${item.type}:${item.id}`}>
                <Card className="flex min-h-44 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-md">
                      <Bookmark
                        className="size-4 fill-current"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-muted text-[0.65rem] font-semibold uppercase">
                      {item.type}
                    </span>
                  </div>
                  <Link
                    href={item.href}
                    className="hover:text-deep-green mt-4 font-semibold"
                  >
                    {item.title}
                  </Link>
                  {item.detail && (
                    <p className="text-muted mt-1 flex-1 text-sm">
                      {item.detail}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(item)}
                    className="text-danger mt-4 inline-flex items-center gap-2 self-start text-xs font-semibold"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-muted mt-5 text-xs">
            Watchlist items are temporarily stored on this device for the
            current organization.
          </p>
        </section>
      )}
    </div>
  );
}
