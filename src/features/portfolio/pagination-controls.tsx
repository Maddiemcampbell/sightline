import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function Pagination({
  path,
  page,
  pageSize,
  total,
  parameters,
}: {
  path: string;
  page: number;
  pageSize: number;
  total: number;
  parameters: Readonly<Record<string, string | number>>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount === 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="border-border mt-6 flex items-center justify-between gap-4 border-t pt-5"
    >
      <PaginationLink
        href={pageHref(path, parameters, page - 1)}
        disabled={page <= 1}
        label="Previous page"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Previous
      </PaginationLink>
      <p className="text-muted text-sm">
        Page <span className="text-ink font-semibold">{page}</span> of{" "}
        <span className="text-ink font-semibold">{pageCount}</span>
      </p>
      <PaginationLink
        href={pageHref(path, parameters, page + 1)}
        disabled={page >= pageCount}
        label="Next page"
      >
        Next
        <ArrowRight aria-hidden="true" className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "border-border bg-surface text-deep-green inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold";
  return disabled ? (
    <span aria-disabled="true" className={`${className} opacity-45`}>
      {children}
    </span>
  ) : (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

function pageHref(
  path: string,
  parameters: Readonly<Record<string, string | number>>,
  page: number,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (key !== "page" && value !== "" && value !== "all")
      query.set(key, String(value));
  }
  if (page > 1) query.set("page", String(page));
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}
