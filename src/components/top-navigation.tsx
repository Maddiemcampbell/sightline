import { Bell, HelpCircle, LogOut } from "lucide-react";

import { logout } from "@/app/auth/actions";
import { getCurrentOrganization } from "@/lib/auth/session";

export async function TopNavigation() {
  const organization = await getCurrentOrganization();
  return (
    <header className="border-border bg-surface flex h-16 items-center justify-between border-b px-[var(--page-gutter)] lg:h-20">
      <div>
        <p className="text-muted text-xs font-medium tracking-[0.08em] uppercase">
          {organization?.name ?? "Sightline"}
        </p>
        <p className="text-ink mt-0.5 text-sm font-semibold">
          Profit intelligence workspace
        </p>
      </div>
      <nav aria-label="Utility navigation">
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              className="text-muted hover:bg-background hover:text-ink grid size-10 place-items-center rounded-md transition-colors"
              aria-label="Help and support"
            >
              <HelpCircle aria-hidden="true" className="size-5" />
            </button>
          </li>
          <li>
            <form action={logout}>
              <button
                type="submit"
                className="text-muted hover:bg-background hover:text-ink grid size-10 place-items-center rounded-md transition-colors"
                aria-label="Log out"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </form>
          </li>
          <li>
            <button
              type="button"
              className="text-muted hover:bg-background hover:text-ink relative grid size-10 place-items-center rounded-md transition-colors"
              aria-label="Notifications"
            >
              <Bell aria-hidden="true" className="size-5" />
              <span
                aria-hidden="true"
                className="bg-accent-strong ring-surface absolute top-2 right-2 size-2 rounded-full ring-2"
              />
            </button>
          </li>
          <li className="ml-2 lg:hidden">
            <span
              aria-label="Matt Anderson, Operations Director"
              className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-full text-xs font-semibold"
            >
              MA
            </span>
          </li>
        </ul>
      </nav>
    </header>
  );
}
