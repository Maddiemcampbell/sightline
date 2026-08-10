import { RefreshCw } from "lucide-react";

import { refreshAdminViewAction } from "@/app/internal/admin/actions";
import { logout } from "@/app/auth/actions";
import { SightlineMark } from "@/components/sightline-mark";
import { AdminSearch } from "@/features/platform-admin/admin-search";
import { AdminNavigation } from "@/features/platform-admin/admin-navigation";
import type { PlatformOperator } from "@/features/platform-admin/types";

export function AdminShell({
  operator,
  children,
}: {
  operator: PlatformOperator;
  children: React.ReactNode;
}) {
  const environment =
    process.env.VERCEL_ENV ??
    (process.env.NODE_ENV === "production" ? "production" : "development");
  const deployment =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local build";
  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-950 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="text-deep-green border-[#b5c963] bg-[#D4E87D] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r">
        <div className="border-deep-green/15 flex h-16 items-center gap-3 border-b px-5">
          <SightlineMark className="bg-deep-green/10 ring-deep-green/15 ring-1" />
          <div>
            <p className="font-semibold tracking-tight">Sightline</p>
            <p className="text-deep-green/70 text-[0.65rem] font-semibold tracking-[0.13em] uppercase">
              Platform Admin
            </p>
          </div>
        </div>
        <AdminNavigation permissions={[...operator.permissions]} />
        <div className="border-deep-green/15 hidden border-t p-4 lg:block">
          <p className="truncate text-sm font-semibold">
            {operator.displayName}
          </p>
          <p className="text-deep-green/70 truncate text-xs">
            {operator.email}
          </p>
          <form action={logout} className="mt-3">
            <input type="hidden" name="next" value="/internal/admin" />
            <button
              type="submit"
              className="text-deep-green/80 hover:text-deep-green text-xs font-semibold hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-border bg-surface sticky top-0 z-20 border-b">
          <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize ring-1 ring-slate-200">
              {environment}
            </span>
            {operator.permissions.has("platform.organizations.read") ||
            operator.permissions.has("platform.users.read") ? (
              <AdminSearch />
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              {operator.permissions.has("platform.dashboard.read") ? (
                <form action={refreshAdminViewAction}>
                  <button
                    type="submit"
                    className="grid size-10 place-items-center rounded-md hover:bg-slate-100"
                    aria-label="Refresh admin data"
                  >
                    <RefreshCw aria-hidden="true" className="size-4" />
                  </button>
                </form>
              ) : null}
              <span
                className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                title={operator.displayName}
              >
                {initials(operator.displayName)}
              </span>
            </div>
          </div>
        </header>
        <main id="main-content" className="min-h-[calc(100vh-8rem)]">
          {children}
        </main>
        <footer className="border-border border-t bg-white px-6 py-4 text-xs text-slate-500">
          <div className="flex flex-wrap justify-between gap-3">
            <span>Sightline Platform v0.1.0</span>
            <span className="capitalize">{environment}</span>
            <span>Last deployment: {deployment}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
