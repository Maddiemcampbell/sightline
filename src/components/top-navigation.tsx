import { HelpCircle, LogOut } from "lucide-react";

import { logout } from "@/app/auth/actions";
import {
  getCurrentMembership,
  getCurrentOrganization,
} from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NotificationRepository } from "@/features/notifications/repository";
import { NotificationMenu } from "@/features/notifications/notification-menu";

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
          <li className="ml-2">
            <span
              aria-label={profile?.data?.full_name ?? "Current user"}
              className="bg-soft-green text-deep-green grid size-9 place-items-center rounded-full text-xs font-semibold"
            >
              {initials}
            </span>
          </li>
        </ul>
      </nav>
    </header>
  );
}
