import Link from "next/link";

import { humanize, type PlatformMetric } from "./services";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
    </header>
  );
}

export function StatusPill({ value }: { value: string }) {
  const color =
    value === "success" ||
    value === "active" ||
    value === "complete" ||
    value === "succeeded" ||
    value === "operational"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : value === "warning" ||
          value === "denied" ||
          value === "fallback" ||
          value === "suspended"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : value === "info"
          ? "bg-blue-50 text-blue-800 ring-blue-200"
          : "bg-red-50 text-red-800 ring-red-200";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${color}`}
    >
      {humanize(value)}
    </span>
  );
}

export function MetricCards({
  metrics,
}: {
  metrics: readonly PlatformMetric[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg border bg-white p-4">
          <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {metric.label}
          </dt>
          <dd className="mt-2 text-xl font-semibold">{metric.value}</dd>
          <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
        </div>
      ))}
    </dl>
  );
}

export function Pagination({
  page,
  pageCount,
  path,
  params,
}: {
  page: number;
  pageCount: number;
  path: string;
  params: URLSearchParams;
}) {
  const href = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    return `${path}?${next.toString()}`;
  };
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t px-4 py-3 text-sm"
    >
      <span className="text-slate-500">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="rounded-md border bg-white px-3 py-2 font-semibold"
          >
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link
            href={href(page + 1)}
            className="rounded-md border bg-white px-3 py-2 font-semibold"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function EmptyTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-10 text-center text-sm text-slate-500">{children}</div>
  );
}

export function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Unavailable";
}
