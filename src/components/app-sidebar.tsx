import { Building2, ChevronRight } from "lucide-react";
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
    <aside className="border-[#1c4b3e] bg-[#0b3328] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:overflow-hidden lg:border-r">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5 lg:h-20 lg:border-b-0 [@media(min-width:1024px)_and_(max-height:900px)]:h-16">
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

      {!currentMembership ? (
        <div className="shrink-0 border-b border-white/10 px-3 py-3 lg:border-b-0 lg:px-4 [@media(min-width:1024px)_and_(max-height:900px)]:py-2">
          <Link
            href="/organizations/new"
            className="flex items-center gap-3 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            <span className="bg-accent/15 text-accent grid size-8 place-items-center rounded-sm">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            Create organization
          </Link>
        </div>
      ) : null}

      <SidebarNavigation showOrganizationLinks={Boolean(currentMembership)} />

      {currentMembership ? (
        <div className="hidden shrink-0 px-4 pb-3 lg:block [@media(min-width:1024px)_and_(max-height:900px)]:pb-2">
          <Link
            href="/organization"
            className="focus-visible:outline-accent-strong group flex items-center gap-3 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
          >
            <span className="bg-accent/15 text-accent grid size-8 shrink-0 place-items-center rounded-sm">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.65rem] font-semibold tracking-[0.12em] text-white/50 uppercase">
                Organization
              </span>
              <span className="block truncate text-sm font-semibold text-white">
                {currentMembership.organization.name}
              </span>
              <span className="block text-xs text-white/60">
                {currentMembership.organization.planKey === "professional"
                  ? "Professional"
                  : "Essential"}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-white/45 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
            />
          </Link>
        </div>
      ) : null}

      <div className="hidden shrink-0 border-t border-white/10 p-4 lg:block [@media(min-width:1024px)_and_(max-height:900px)]:p-2">
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
