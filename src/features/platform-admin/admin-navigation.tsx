"use client";

import {
  Activity,
  Bot,
  Building2,
  Bug,
  CircleAlert,
  ClipboardList,
  CreditCard,
  Gauge,
  HeartPulse,
  Lightbulb,
  PackageCheck,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { MobileNavigationMenu } from "@/components/mobile-navigation-menu";
import type { PlatformPermission } from "@/features/platform-admin/types";

const navigation = [
  ["/internal/admin", "Overview", Gauge, "platform.dashboard.read"],
  [
    "/internal/admin/organizations",
    "Organizations",
    Building2,
    "platform.organizations.read",
  ],
  ["/internal/admin/users", "Users", Users, "platform.users.read"],
  [
    "/internal/admin/provisioning",
    "Provisioning",
    CreditCard,
    "platform.provisioning.manage",
  ],
  [
    "/internal/admin/customer-health",
    "Customer Health",
    HeartPulse,
    "platform.organizations.read",
  ],
  ["/internal/admin/errors", "Errors", CircleAlert, "platform.support.read"],
  ["/internal/admin/bugs", "Bug Reports", Bug, "platform.support.read"],
  [
    "/internal/admin/feature-requests",
    "Feature Requests",
    Lightbulb,
    "platform.support.read",
  ],
  ["/internal/admin/jobs", "Jobs", ClipboardList, "platform.jobs.read"],
  ["/internal/admin/ai", "AI Usage", Bot, "platform.ai.read"],
  ["/internal/admin/system", "System Health", Activity, "platform.health.read"],
  ["/internal/admin/audit", "Audit Log", ScrollText, "platform.audit.read"],
  [
    "/internal/admin/releases",
    "Releases",
    PackageCheck,
    "platform.releases.read",
  ],
  [
    "/internal/admin/operators",
    "Platform Operators",
    ShieldCheck,
    "platform.admin.manage",
  ],
  ["/internal/admin/settings", "Settings", Settings, "platform.flags.manage"],
] as const satisfies readonly [
  string,
  string,
  typeof Gauge,
  PlatformPermission,
][];

export function AdminNavigation({
  permissions,
  displayName,
  email,
}: {
  permissions: readonly PlatformPermission[];
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();
  const availableNavigation = navigation.filter(([, , , permission]) =>
    permissions.includes(permission),
  );
  const currentLabel =
    availableNavigation.find(([href]) =>
      isAdminPathActive(pathname, href),
    )?.[1] ?? "Platform Admin";

  return (
    <>
      <div className="lg:hidden">
        <MobileNavigationMenu
          currentLabel={currentLabel}
          title="Platform administration"
          description="Choose an operational workspace. Your current page is highlighted."
          tone="admin"
          footer={
            <div>
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-deep-green/70 truncate text-xs">{email}</p>
              <form action={logout} className="mt-3">
                <input type="hidden" name="next" value="/internal/admin" />
                <button
                  type="submit"
                  className="border-deep-green/25 min-h-10 w-full rounded-md border bg-white/30 px-3 text-sm font-semibold hover:bg-white/45"
                >
                  Sign out
                </button>
              </form>
            </div>
          }
        >
          <nav aria-label="Platform administration">
            <AdminNavigationList
              pathname={pathname}
              items={availableNavigation}
            />
          </nav>
        </MobileNavigationMenu>
      </div>
      <nav
        aria-label="Platform administration"
        className="hidden p-3 lg:block lg:flex-1 lg:overflow-y-auto"
      >
        <AdminNavigationList pathname={pathname} items={availableNavigation} />
      </nav>
    </>
  );
}

function AdminNavigationList({
  pathname,
  items,
}: {
  pathname: string;
  items: (typeof navigation)[number][];
}) {
  return (
    <ul className="space-y-1">
      {items.map(([href, label, Icon]) => {
        const active = isAdminPathActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-deep-green text-[#D4E87D]"
                  : "text-deep-green hover:bg-deep-green hover:text-[#D4E87D]"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function isAdminPathActive(pathname: string, href: string) {
  return href === "/internal/admin"
    ? pathname === href
    : pathname.startsWith(href);
}
