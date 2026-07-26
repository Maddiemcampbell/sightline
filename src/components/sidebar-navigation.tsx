"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNavigation } from "@/domain/navigation";
import { WatchlistShortcut } from "@/features/workspace/watchlist-shortcut";

export function SidebarNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary navigation"
      className="overflow-x-auto border-b border-white/10 px-3 py-3 lg:flex-1 lg:overflow-visible lg:border-b-0 lg:px-4 lg:py-4"
    >
      <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
        {primaryNavigation.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
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
    </nav>
  );
}
