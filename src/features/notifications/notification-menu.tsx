"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import type { NotificationView } from "@/features/notifications/types";

export function NotificationMenu({
  initialItems,
}: {
  initialItems: readonly NotificationView[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [items, updateOptimistic] = useOptimistic(
    initialItems,
    (
      current,
      update: { kind: "one"; id: string } | { kind: "all" },
    ): readonly NotificationView[] => {
      const readAt = new Date().toISOString();
      return current.map((item) =>
        update.kind === "all" || item.id === update.id
          ? { ...item, readAt: item.readAt ?? readAt }
          : item,
      );
    },
  );
  const unread = items.filter((item) => !item.readAt).length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-muted hover:bg-background hover:text-ink relative grid size-10 place-items-center rounded-md"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span className="bg-accent ring-surface text-deep-green absolute top-1 right-1 min-w-4 rounded-full px-1 text-center text-[10px] font-bold ring-2">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <section className="border-border bg-surface absolute top-12 right-0 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                disabled={pending}
                className="text-deep-green flex items-center gap-1 text-xs font-semibold"
                onClick={() =>
                  startTransition(async () => {
                    updateOptimistic({ kind: "all" });
                    await markAllNotificationsReadAction();
                  })
                }
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="mt-3 max-h-96 space-y-1 overflow-y-auto">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href ?? "#"}
                  onClick={() => {
                    setOpen(false);
                    if (!item.readAt)
                      startTransition(async () => {
                        updateOptimistic({ kind: "one", id: item.id });
                        await markNotificationReadAction(item.id);
                      });
                  }}
                  className={`block rounded-md p-3 text-sm ${item.readAt ? "text-muted" : "bg-accent/25 text-ink"}`}
                >
                  <span className="font-semibold">{item.title}</span>
                  {item.body && <span className="mt-1 block">{item.body}</span>}
                  <time className="mt-1 block text-xs">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </Link>
              ))
            ) : (
              <p className="text-muted py-8 text-center text-sm">
                You’re all caught up.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
