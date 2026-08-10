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
}: {
  permissions: readonly PlatformPermission[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Platform administration"
      className="overflow-x-auto p-3 lg:flex-1 lg:overflow-y-auto"
    >
      <ul className="flex min-w-max gap-1 lg:block lg:min-w-0 lg:space-y-1">
        {navigation
          .filter(([, , , permission]) => permissions.includes(permission))
          .map(([href, label, Icon]) => {
            const active =
              href === "/internal/admin"
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
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
    </nav>
  );
}
