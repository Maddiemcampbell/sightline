"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  searchPlatformAction,
  type PlatformSearchState,
} from "@/app/internal/admin/actions";

const INITIAL_STATE: PlatformSearchState = { query: "", results: [] };

export function AdminSearch() {
  const [state, action, pending] = useActionState(
    searchPlatformAction,
    INITIAL_STATE,
  );
  const [query, setQuery] = useState("");
  const [transitionPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runSearch = useCallback(
    (value: string) => {
      if (timer.current) clearTimeout(timer.current);
      const data = new FormData();
      data.set("q", value);
      startTransition(() => action(data));
    },
    [action],
  );
  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    timer.current = setTimeout(() => runSearch(normalized), 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, runSearch]);
  const searching = pending || transitionPending;
  return (
    <div className="relative w-full max-w-md">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query.trim());
        }}
      >
        <label htmlFor="platform-search" className="sr-only">
          Search organizations, users, or email
        </label>
        <Search
          aria-hidden="true"
          className="text-muted pointer-events-none absolute top-2.5 left-3 size-4"
        />
        <input
          id="platform-search"
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search organizations, users, email…"
          className="border-border bg-surface min-h-10 w-full rounded-md border pr-24 pl-9 text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="text-info absolute top-1 right-1 min-h-8 rounded-sm px-3 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {state.error ? (
        <p role="alert" className="text-danger mt-1 text-xs">
          {state.error}
        </p>
      ) : null}
      {state.query && !state.error ? (
        <div className="border-border bg-surface absolute top-12 right-0 left-0 z-30 rounded-md border p-2 shadow-lg">
          <p className="text-muted px-2 py-1 text-xs font-semibold uppercase">
            Customer directory results
          </p>
          {state.results.length ? (
            <ul>
              {state.results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <Link
                    href={result.href}
                    className="block rounded-sm p-2 hover:bg-slate-50"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {result.title}
                      </span>
                      <span className="text-muted text-[0.65rem] font-semibold uppercase">
                        {result.type} · {result.status}
                      </span>
                    </span>
                    <span className="text-muted block text-xs">
                      {result.subtitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted px-2 py-3 text-sm">No matching records.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
