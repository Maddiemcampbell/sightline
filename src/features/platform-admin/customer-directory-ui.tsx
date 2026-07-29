import Link from "next/link";

import type { AdminAccountStatus } from "@/features/platform-admin/customer-directory-types";

export function AdminStatusBadge({ status }: { status: AdminAccountStatus }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    pending_deletion: "bg-amber-50 text-amber-800 ring-amber-200",
    archived: "bg-slate-100 text-slate-700 ring-slate-200",
    unverified: "bg-amber-50 text-amber-800 ring-amber-200",
    suspended: "bg-red-50 text-red-800 ring-red-200",
    deleted: "bg-slate-100 text-slate-700 ring-slate-200",
  }[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {humanize(status)}
    </span>
  );
}

export function UnavailableValue({
  label = "Unavailable",
}: {
  label?: string;
}) {
  return <span className="text-slate-400">{label}</span>;
}

export function DirectoryPagination({
  path,
  params,
  page,
  pageCount,
}: {
  path: string;
  params: URLSearchParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Directory pagination"
      className="flex items-center justify-between gap-4 border-t border-slate-200 px-4 py-4"
    >
      <p className="text-xs text-slate-500">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <PageLink
          path={path}
          params={params}
          page={page - 1}
          disabled={page <= 1}
        >
          Previous
        </PageLink>
        <PageLink
          path={path}
          params={params}
          page={page + 1}
          disabled={page >= pageCount}
        >
          Next
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  path,
  params,
  page,
  disabled,
  children,
}: {
  path: string;
  params: URLSearchParams;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
      >
        {children}
      </span>
    );
  }
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return (
    <Link
      href={`${path}?${next.toString()}`}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
