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
    <aside className="border-[#1c4b3e] bg-[#0b3328] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r">
      <div className="flex h-16 items-center border-b border-white/10 px-5 lg:h-20 lg:border-b-0">
        <Link
          href="/"
          className="focus-visible:outline-accent-strong flex items-center gap-3 rounded-sm text-white"
          aria-label="Sightline home"
        >
          <SightlineMark className="bg-white/10 ring-1 ring-white/15" />
          <span className="text-lg font-semibold tracking-[-0.025em]">
            Sightline
          </span>
        </Link>
      </div>

      <div className="border-b border-white/10 px-3 py-3 lg:border-b-0 lg:px-4">
        {currentMembership ? (
          <form action={switchOrganizationAction} className="relative">
            <label htmlFor="organization-switcher" className="sr-only">
              Switch organization
            </label>
            <span className="bg-accent/15 text-accent pointer-events-none absolute top-2.5 left-3 z-10 grid size-8 place-items-center rounded-sm">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <select
              id="organization-switcher"
              name="organizationId"
              defaultValue={currentMembership.organizationId}
              className="min-h-13 w-full appearance-none rounded-md border border-white/15 bg-white/5 pr-9 pl-14 text-sm font-semibold text-white hover:bg-white/10"
            >
              {memberships.map((membership) => (
                <option key={membership.id} value={membership.organizationId}>
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
              className="text-accent mt-2 w-full text-right text-xs font-semibold"
            >
              Switch organization
            </button>
          </form>
        ) : (
          <Link
            href="/organizations/new"
            className="flex items-center gap-3 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            <span className="bg-accent/15 text-accent grid size-8 place-items-center rounded-sm">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            Create organization
          </Link>
        )}
      </div>

      <nav
        aria-label="Primary navigation"
        className="overflow-x-auto border-b border-white/10 px-3 py-3 lg:flex-1 lg:overflow-visible lg:border-b-0 lg:px-4 lg:py-4"
      >
        <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
          {primaryNavigation.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="focus-visible:outline-accent-strong flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon aria-hidden="true" className="size-[1.125rem]" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {currentMembership ? (
        <div className="flex flex-col gap-2 px-4 pb-3">
          <Link
            href="/organization"
            className="text-sm font-semibold text-white/65 hover:text-white"
          >
            Organization profile
          </Link>
          <Link
            href="/settings/team"
            className="text-sm font-semibold text-white/65 hover:text-white"
          >
            Team management
          </Link>
        </div>
      ) : null}

      <div className="hidden border-t border-white/10 p-4 lg:block">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span
            aria-hidden="true"
            className="text-deep-green grid size-9 shrink-0 place-items-center rounded-full bg-[#eef3e5] text-sm font-semibold"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {principal?.email ?? "Sightline user"}
            </p>
            <p className="truncate text-xs text-white/60">
              {currentMembership
                ? `${currentMembership.role[0]?.toUpperCase()}${currentMembership.role.slice(1)}`
                : "No organization"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
