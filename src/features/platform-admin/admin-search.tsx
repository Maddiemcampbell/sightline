"use client";

import { Search } from "lucide-react";
import { useActionState } from "react";

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
  return (
    <div className="relative w-full max-w-md">
      <form action={action} role="search">
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
          defaultValue={state.query}
          placeholder="Search organizations, users, email…"
          className="border-border bg-surface min-h-10 w-full rounded-md border pr-24 pl-9 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-info absolute top-1 right-1 min-h-8 rounded-sm px-3 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
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
            Mock directory results
          </p>
          {state.results.length ? (
            <ul>
              {state.results.map((result) => (
                <li
                  key={`${result.type}-${result.id}`}
                  className="rounded-sm p-2 hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold">{result.title}</p>
                  <p className="text-muted text-xs">{result.subtitle}</p>
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
