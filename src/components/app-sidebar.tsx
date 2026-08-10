import { Building2 } from "lucide-react";
import Link from "next/link";

import { SightlineMark } from "@/components/sightline-mark";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/session";
import { SidebarNavigation } from "@/components/sidebar-navigation";

export async function AppSidebar() {
  const [principal, currentMembership] = await Promise.all([
    getCurrentUser(),
    getCurrentMembership(),
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
          <div className="flex min-h-13 items-center gap-3 rounded-md border border-white/15 bg-white/5 px-3 py-2.5">
            <span className="bg-accent/15 text-accent grid size-8 shrink-0 place-items-center rounded-sm">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {currentMembership.organization.name}
              </p>
              <p className="text-xs text-white/60">
                {currentMembership.organization.planKey === "professional"
                  ? "Professional"
                  : "Essential"}
              </p>
            </div>
          </div>
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

      <SidebarNavigation showOrganizationLinks={Boolean(currentMembership)} />

      {currentMembership ? (
        <div className="hidden flex-col gap-2 px-4 pb-3 lg:flex">
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
