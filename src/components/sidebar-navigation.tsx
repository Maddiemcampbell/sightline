"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Settings } from "lucide-react";

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
            <nav aria-label="Account and organization navigation">
              <p className="px-3 pb-2 text-[0.65rem] font-semibold tracking-[0.12em] text-white/45 uppercase">
                Account
              </p>
              <ul className="space-y-1">
                <li>
                  <WatchlistShortcut />
                </li>
                <li>
                  <Link
                    href="/settings"
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
                  >
                    <Settings aria-hidden="true" className="size-[1.125rem]" />
                    Settings
                  </Link>
                </li>
                {showOrganizationLinks ? (
                  <li>
                    <Link
                      href="/organization"
                      className="block min-h-11 rounded-md px-3 py-2.5 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white"
                    >
                      Organization &amp; team
                    </Link>
                  </li>
                ) : null}
              </ul>
            </nav>
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
  const home = primaryNavigation[0]!;
  const workflow = primaryNavigation.slice(1, 7);
  const intelligence = primaryNavigation.slice(7);
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <ul>
        <NavigationItem item={home} pathname={pathname} home />
      </ul>
      <NavigationGroup
        label="Work"
        items={workflow}
        pathname={pathname}
        compact={compact}
      />
      <NavigationGroup
        label="Insights & records"
        items={intelligence}
        pathname={pathname}
        compact={compact}
      />
    </div>
  );
}

function NavigationGroup({
  label,
  items,
  pathname,
  compact,
}: {
  label: string;
  items: typeof primaryNavigation;
  pathname: string;
  compact: boolean;
}) {
  return (
    <div>
      <p className="px-3 pb-1.5 text-[0.62rem] font-semibold tracking-[0.13em] text-white/40 uppercase">
        {label}
      </p>
      <ul className={compact ? "space-y-0.5" : "space-y-1"}>
        {items.map((item) => (
          <NavigationItem key={item.href} item={item} pathname={pathname} />
        ))}
      </ul>
    </div>
  );
}

function NavigationItem({
  item: { href, icon: Icon, label },
  pathname,
  home = false,
}: {
  item: (typeof primaryNavigation)[number];
  pathname: string;
  home?: boolean;
}) {
  const active = isActivePath(pathname, href);
  if (home)
    return (
      <li>
        <Link
          href={href}
          aria-label="Home"
          aria-current={active ? "page" : undefined}
          className={`focus-visible:outline-accent-strong group flex min-h-[4.25rem] items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
            active
              ? "border-accent bg-accent text-deep-green shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
              : "border-white/15 bg-gradient-to-br from-white/[0.11] to-white/[0.04] text-white hover:border-white/25 hover:from-white/[0.16] hover:to-white/[0.07]"
          }`}
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-lg ${
              active
                ? "bg-deep-green text-accent"
                : "bg-accent/15 text-accent ring-1 ring-white/10"
            }`}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Home</span>
            <span
              className={`mt-0.5 block truncate text-[0.68rem] font-medium ${
                active ? "text-deep-green/65" : "text-white/50"
              }`}
            >
              Portfolio overview
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className={`size-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
              active ? "text-deep-green/60" : "text-white/35"
            }`}
          />
        </Link>
      </li>
    );
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`focus-visible:outline-accent-strong flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
          active
            ? "bg-accent text-deep-green hover:bg-accent-strong"
            : "text-white/72 hover:bg-white/10 hover:text-white"
        } ${active ? "font-semibold" : "font-medium"}`}
      >
        <Icon aria-hidden="true" className="size-[1.125rem]" />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
