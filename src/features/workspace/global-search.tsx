"use client";

import Link from "next/link";
import {
  FileText,
  FolderSearch,
  ListChecks,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useWorkspaceResources } from "@/features/workspace/workspace-provider";
import type {
  SearchResource,
  SearchResourceType,
} from "@/features/workspace/types";

const groupLabels: Record<SearchResourceType, string> = {
  project: "Projects",
  risk: "Risks",
  action: "Actions",
  document: "Documents",
  user: "People",
};
const icons = {
  project: FolderSearch,
  risk: ShieldAlert,
  action: ListChecks,
  document: FileText,
  user: UserRound,
} satisfies Record<SearchResourceType, typeof Search>;

export function GlobalSearch() {
  const { searchResources } = useWorkspaceResources();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<readonly string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveIndex(0);
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return searchResources
      .filter((item) =>
        `${item.title} ${item.detail ?? ""}`
          .toLocaleLowerCase()
          .includes(normalized),
      )
      .slice(0, 30);
  }, [query, searchResources]);

  function remember(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    setRecent((current) =>
      [normalized, ...current.filter((item) => item !== normalized)].slice(
        0,
        5,
      ),
    );
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function handleKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length ? (current + 1) % results.length : 0,
      );
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length ? (current - 1 + results.length) % results.length : 0,
      );
    }
    if (event.key === "Enter" && results[activeIndex]) {
      remember(query);
      document.getElementById(`global-search-result-${activeIndex}`)?.click();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        className="text-muted hover:bg-background hover:text-ink grid size-10 place-items-center rounded-md"
        aria-label="Search Sightline"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-[#071f19]/40 p-4 pt-[12vh] backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Search Sightline"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
                ),
              );
              const first = focusable[0];
              const last = focusable.at(-1);
              if (event.shiftKey && document.activeElement === first && last) {
                event.preventDefault();
                last.focus();
              } else if (
                !event.shiftKey &&
                document.activeElement === last &&
                first
              ) {
                event.preventDefault();
                first.focus();
              }
            }}
            className="border-border/90 bg-surface w-full max-w-xl overflow-hidden rounded-2xl border shadow-[0_24px_70px_rgba(19,33,42,0.22)]"
          >
            <div className="flex min-h-16 items-center gap-3 px-5">
              <Search
                aria-hidden="true"
                className="text-muted size-5 shrink-0"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeys}
                placeholder="Search projects, risks, actions, documents, or people…"
                className="placeholder:text-muted/75 h-14 min-w-0 flex-1 border-0 bg-transparent text-base outline-none focus-visible:!outline-none"
                role="combobox"
                aria-controls="global-search-results"
                aria-expanded="true"
                aria-activedescendant={
                  results[activeIndex]
                    ? `global-search-result-${activeIndex}`
                    : undefined
                }
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted hover:bg-background hover:text-ink grid size-8 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1"
                  aria-label="Clear search"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
              <span
                aria-hidden="true"
                className="bg-border mx-0.5 h-6 w-px shrink-0"
              />
              <button
                type="button"
                onClick={close}
                className="text-muted hover:bg-background hover:text-ink grid size-9 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1"
                aria-label="Close search"
              >
                <X aria-hidden="true" className="size-4.5" />
              </button>
            </div>
            {(query || recent.length > 0) && (
              <div
                id="global-search-results"
                role="listbox"
                className="border-border max-h-[28rem] overflow-y-auto border-t p-2"
              >
                {!query && recent.length > 0 && (
                  <div className="p-3">
                    <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                      Recent
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recent.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setQuery(item)}
                          className="border-border hover:bg-background rounded-full border px-3 py-1.5 text-xs transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {query && !results.length && (
                  <div className="px-4 py-10 text-center">
                    <p className="font-semibold">No matching results</p>
                    <p className="text-muted mt-1 text-sm">
                      Try a project number, person, document, risk, or action.
                    </p>
                  </div>
                )}
                {query &&
                  groupResults(results).map(([type, items]) => (
                    <div key={type} className="mb-2">
                      <p className="text-muted px-3 py-2 text-[0.68rem] font-semibold tracking-wide uppercase">
                        {groupLabels[type]}
                      </p>
                      {items.map(({ item, index }) => {
                        const Icon = icons[item.type];
                        return (
                          <Link
                            id={`global-search-result-${index}`}
                            key={`${item.type}:${item.id}`}
                            href={item.href}
                            role="option"
                            aria-selected={index === activeIndex}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => {
                              remember(query);
                              close();
                            }}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                              index === activeIndex ? "bg-background" : ""
                            }`}
                          >
                            <span className="border-border bg-surface grid size-9 shrink-0 place-items-center rounded-lg border">
                              <Icon
                                aria-hidden="true"
                                className="text-deep-green size-4"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">
                                {item.title}
                              </span>
                              {item.detail && (
                                <span className="text-muted block truncate text-xs">
                                  {item.detail}
                                </span>
                              )}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function groupResults(
  results: readonly SearchResource[],
): readonly [
  SearchResourceType,
  readonly { item: SearchResource; index: number }[],
][] {
  const order: readonly SearchResourceType[] = [
    "project",
    "risk",
    "action",
    "document",
    "user",
  ];
  return order.flatMap((type) => {
    const items = results
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.type === type);
    return items.length ? [[type, items] as const] : [];
  });
}
