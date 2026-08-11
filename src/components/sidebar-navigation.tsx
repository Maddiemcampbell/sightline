"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileNavigationMenu } from "@/components/mobile-navigation-menu";
import { primaryNavigation } from "@/domain/navigation";
import { WatchlistShortcut } from "@/features/workspace/watchlist-shortcut";

export function SidebarNavigation({
  showOrganizationLinks = false,
}: {
  showOrganizationLinks?: boolean;
}) {
  const pathname = usePathname();
  const currentLabel =
    primaryNavigation.find(({ href }) => isActivePath(pathname, href))?.label ??
    (pathname.startsWith("/watchlist") ? "My Watchlist" : "Sightline");

  return (
    <>
      <div className="lg:hidden">
        <MobileNavigationMenu
          currentLabel={currentLabel}
          title="Navigate Sightline"
          description="Choose a workspace destination. Your current page is highlighted."
          tone="client"
          footer={
            showOrganizationLinks ? (
              <nav aria-label="Organization navigation">
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/organization"
                      className="block min-h-10 rounded-md px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"
                    >
                      Organization &amp; team
                    </Link>
                  </li>
                </ul>
              </nav>
            ) : null
          }
        >
          <nav aria-label="Primary navigation">
            <NavigationList pathname={pathname} />
          </nav>
        </MobileNavigationMenu>
      </div>
      <nav
        aria-label="Primary navigation"
        className="hidden [scrollbar-gutter:stable] border-b border-white/10 px-3 py-3 lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:px-4 lg:py-4 [@media(min-width:1024px)_and_(max-height:900px)]:py-2"
      >
        <NavigationList pathname={pathname} compact />
      </nav>
    </>
  );
}

function NavigationList({
  pathname,
  compact = false,
}: {
  pathname: string;
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "space-y-0.5" : "space-y-1"}>
      {primaryNavigation.map(({ href, icon: Icon, label }) => {
        const active = isActivePath(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`focus-visible:outline-accent-strong flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-deep-green hover:bg-accent-strong"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" className="size-[1.125rem]" />
              <span className="truncate">{label}</span>
            </Link>
          </li>
        );
      })}
      <li>
        <WatchlistShortcut />
      </li>
    </ul>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
