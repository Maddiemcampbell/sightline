import { LogOut } from "lucide-react";

import { logout } from "@/app/auth/actions";
import {
  getCurrentMembership,
  getCurrentOrganization,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationRepository } from "@/features/notifications/repository";
import { NotificationMenu } from "@/features/notifications/notification-menu";
import { HelpSupportMenu } from "@/components/help-support-menu";
import { GlobalSearch } from "@/features/workspace/global-search";
import Link from "next/link";

export async function TopNavigation() {
  const [organization, membership] = await Promise.all([
    getCurrentOrganization(),
    getCurrentMembership(),
  ]);
  const client = await createServerSupabaseClient();
  const notifications = membership
    ? await new NotificationRepository(client).list(
        membership.organizationId,
        membership.id,
      )
    : [];
  const profile = membership
    ? await client
        .from("users")
        .select("full_name")
        .eq("organization_id", membership.organizationId)
        .eq("id", membership.applicationUserId)
        .maybeSingle()
    : null;
  const initials = (profile?.data?.full_name ?? "User")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="border-border bg-surface flex h-16 min-w-0 items-center justify-between gap-2 border-b px-[var(--page-gutter)] lg:h-20">
      <div className="min-w-0">
        <p className="text-muted max-w-44 truncate text-xs font-medium tracking-[0.08em] uppercase sm:max-w-none">
          {organization?.name ?? "Sightline"}
        </p>
        <p className="text-ink mt-0.5 hidden text-sm font-semibold sm:block">
          Profit intelligence workspace
        </p>
      </div>
      <nav aria-label="Utility navigation">
        <ul className="flex items-center gap-0 sm:gap-1">
          <li>
            <GlobalSearch />
          </li>
          <li>
            <HelpSupportMenu />
          </li>
          <li>
            <NotificationMenu initialItems={notifications} />
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
          <li className="ml-1 hidden sm:block">
            <Link
              href="/settings/profile"
              aria-label={profile?.data?.full_name ?? "Current user"}
              className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-full text-xs font-semibold"
            >
              {initials}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
