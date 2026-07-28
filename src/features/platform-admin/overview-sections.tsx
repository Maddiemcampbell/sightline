import { ArrowRight, RefreshCw, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type {
  AdminListItem,
  PlatformMetric,
} from "@/features/platform-admin/services";
import type { PlatformPermission } from "@/features/platform-admin/types";

export function PlatformStatusSection({
  metrics,
}: {
  metrics: readonly PlatformMetric[];
}) {
  return (
    <AdminSection
      title="Platform Status"
      description="Current operational posture from platform health and execution records."
    >
      <MetricGrid metrics={metrics} />
    </AdminSection>
  );
}

export function RecentActivitySection({
  items,
}: {
  items: readonly AdminListItem[];
}) {
  return <ListSection title="Recent Activity" items={items} />;
}

export function RecentOrganizationsSection({
  items,
}: {
  items: readonly AdminListItem[];
}) {
  return (
    <ListSection
      title="Recent Organizations"
      items={items}
      href="/internal/admin/organizations"
    />
  );
}

export function RecentErrorsSection({
  items,
}: {
  items: readonly AdminListItem[];
}) {
  return (
    <ListSection
      title="Recent Errors"
      items={items}
      href="/internal/admin/errors"
    />
  );
}

export function SystemHealthSection({
  metrics,
}: {
  metrics: readonly PlatformMetric[];
}) {
  return (
    <AdminSection title="System Health">
      <MetricGrid metrics={metrics} />
    </AdminSection>
  );
}

export function AIUsageSection({
  metrics,
}: {
  metrics: readonly PlatformMetric[];
}) {
  return (
    <AdminSection title="AI Usage">
      <MetricGrid metrics={metrics} />
    </AdminSection>
  );
}

export function QuickActionsSection({
  permissions,
}: {
  permissions: ReadonlySet<PlatformPermission>;
}) {
  const actions = [
    [
      "/internal/admin/organizations",
      "Find an organization",
      Search,
      "platform.organizations.read",
    ],
    [
      "/internal/admin/jobs",
      "Review failed jobs",
      RefreshCw,
      "platform.jobs.read",
    ],
    [
      "/internal/admin/audit",
      "Inspect staff access",
      ShieldCheck,
      "platform.audit.read",
    ],
  ] as const;
  return (
    <AdminSection title="Quick Actions">
      <div className="grid gap-3 sm:grid-cols-3">
        {actions
          .filter(([, , , permission]) =>
            permissions.has(permission as PlatformPermission),
          )
          .map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className="border-border flex items-center gap-3 rounded-md border bg-white p-4 text-sm font-semibold hover:border-slate-400"
            >
              <Icon aria-hidden="true" className="size-4 text-slate-500" />
              {label}
            </Link>
          ))}
      </div>
    </AdminSection>
  );
}

function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricGrid({ metrics }: { metrics: readonly PlatformMetric[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-md bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
            <StatusDot status={metric.status} />
            {metric.label}
          </dt>
          <dd className="mt-2 text-xl font-semibold">{metric.value}</dd>
          <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
        </div>
      ))}
    </dl>
  );
}

function ListSection({
  title,
  items,
  href,
}: {
  title: string;
  items: readonly AdminListItem[];
  href?: string;
}) {
  return (
    <AdminSection title={title}>
      <ul className="divide-y divide-slate-100">
        {!items.length ? (
          <li className="py-3 text-sm text-slate-500">No recent records.</li>
        ) : null}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            <StatusDot status={item.status ?? "info"} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
            </div>
          </li>
        ))}
      </ul>
      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          View all <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </AdminSection>
  );
}

function StatusDot({ status }: { status: PlatformMetric["status"] }) {
  const color = {
    healthy: "bg-emerald-600",
    warning: "bg-amber-500",
    critical: "bg-red-600",
    info: "bg-blue-600",
  }[status];
  return (
    <span
      aria-hidden="true"
      className={`mt-1 size-2 shrink-0 rounded-full ${color}`}
    />
  );
}
