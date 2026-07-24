import { Building2, ChevronDown } from "lucide-react";
import Link from "next/link";

import { switchOrganizationAction } from "@/app/organization/actions";
import { primaryNavigation } from "@/domain/navigation";
import { SightlineMark } from "@/components/sightline-mark";
import {
  getCurrentMembership,
  getCurrentMemberships,
  getCurrentUser,
} from "@/lib/auth/session";

export async function AppSidebar() {
  const [principal, currentMembership, memberships] = await Promise.all([
    getCurrentUser(),
    getCurrentMembership(),
    getCurrentMemberships(),
  ]);
  const initials = (principal?.email ?? "User")
    .split("@")[0]!
    .split(/[._-]+/)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

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
        {currentMembership ? (
          <form action={switchOrganizationAction} className="relative">
            <label
              htmlFor="organization-switcher"
              className="sr-only"
            >
              Switch organization
            </label>
            <span className="pointer-events-none absolute top-2.5 left-3 z-10 bg-deep-green grid size-8 place-items-center rounded-sm text-white">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <select
              id="organization-switcher"
              name="organizationId"
              defaultValue={currentMembership.organizationId}
              className="border-border bg-background hover:bg-soft-green text-ink min-h-13 w-full appearance-none rounded-md border pr-9 pl-14 text-sm font-semibold"
            >
              {memberships.map((membership) => (
                <option
                  key={membership.id}
                  value={membership.organizationId}
                >
                  {membership.organization.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="text-muted pointer-events-none absolute top-5 right-3 size-4"
            />
            <button
              type="submit"
              className="text-deep-green mt-2 w-full text-right text-xs font-semibold"
            >
              Switch organization
            </button>
          </form>
        ) : (
          <Link
            href="/organizations/new"
            className="border-border bg-background hover:bg-soft-green flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-semibold"
          >
            <span className="bg-deep-green grid size-8 place-items-center rounded-sm text-white">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            Create organization
          </Link>
        )}
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

      {currentMembership ? (
        <div className="px-4 pb-3">
          <Link
            href="/organization"
            className="text-muted hover:text-deep-green text-sm font-semibold"
          >
            Organization profile
          </Link>
        </div>
      ) : null}

      <div className="border-border hidden border-t p-4 lg:block">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span
            aria-hidden="true"
            className="bg-soft-green text-deep-green grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-ink truncate text-sm font-semibold">
              {principal?.email ?? "Sightline user"}
            </p>
            <p className="text-muted truncate text-xs">
              {currentMembership ? "Organization owner" : "No organization"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
