import { Building2, ChevronDown } from "lucide-react";
import Link from "next/link";

import { primaryNavigation } from "@/domain/navigation";
import { SightlineMark } from "@/components/sightline-mark";

export function AppSidebar() {
  return (
    <aside className="border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r">
      <div className="border-border flex h-16 items-center border-b px-5 lg:h-20 lg:border-b-0">
        <Link
          href="/"
          className="text-ink focus-visible:outline-accent-strong flex items-center gap-3 rounded-sm"
          aria-label="Sightline home"
        >
          <SightlineMark />
          <span className="text-lg font-semibold tracking-[-0.025em]">
            Sightline
          </span>
        </Link>
      </div>

      <div className="border-border border-b px-3 py-3 lg:border-b-0 lg:px-4">
        <button
          type="button"
          className="border-border bg-background hover:bg-soft-green flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors"
          aria-label="Switch company, currently BuildCo Construction"
        >
          <span className="bg-deep-green grid size-8 shrink-0 place-items-center rounded-sm text-white">
            <Building2 aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-muted block truncate text-xs font-medium">
              Company
            </span>
            <span className="text-ink block truncate text-sm font-semibold">
              BuildCo Construction
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="text-muted size-4" />
        </button>
      </div>

      <nav
        aria-label="Primary navigation"
        className="border-border overflow-x-auto border-b px-3 py-3 lg:flex-1 lg:overflow-visible lg:border-b-0 lg:px-4 lg:py-4"
      >
        <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
          {primaryNavigation.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-muted hover:bg-soft-green hover:text-deep-green focus-visible:outline-accent-strong flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <Icon aria-hidden="true" className="size-[1.125rem]" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-border hidden border-t p-4 lg:block">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span
            aria-hidden="true"
            className="bg-soft-green text-deep-green grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
          >
            MA
          </span>
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-semibold">
              Matt Anderson
            </p>
            <p className="text-muted truncate text-xs">Operations Director</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
