import { Bot, Plug, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

import type { TimelineItem } from "@/features/activity/types";

const actorPresentation = {
  user: {
    label: "Human",
    Icon: UserRound,
    color: "bg-soft-green text-deep-green",
  },
  system: { label: "System", Icon: Bot, color: "bg-background text-muted" },
  ai: {
    label: "AI analysis",
    Icon: Sparkles,
    color: "bg-accent/30 text-deep-green",
  },
  integration: {
    label: "Integration",
    Icon: Plug,
    color: "bg-background text-muted",
  },
} as const;

export function ActivityTimeline({
  items,
  condensed = false,
}: {
  items: readonly TimelineItem[];
  condensed?: boolean;
}) {
  if (!items.length)
    return <p className="text-muted text-sm">No activity has been recorded.</p>;
  return (
    <ol className="space-y-4">
      {items.map((item) => {
        const presentation = actorPresentation[item.actorType];
        const Icon = presentation.Icon;
        return (
          <li key={item.id} className="border-border relative border-l-2 pl-5">
            <span
              className={`absolute top-0 -left-3 grid size-6 place-items-center rounded-full ${presentation.color}`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {item.actorType === "user" && (
                item.actorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.actorAvatarUrl} alt="" className="size-6 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="bg-soft-green text-deep-green grid size-6 place-items-center rounded-full text-[9px] font-bold">
                    {(item.actorName ?? "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                )
              )}
              <span className="text-xs font-semibold">
                {presentation.label}
              </span>
              <span className="text-muted text-xs">
                {item.actorName ??
                  (item.actorType === "user" ? "Unknown user" : "Sightline")}
              </span>
              <time className="text-muted text-xs" dateTime={item.occurredAt}>
                {new Date(item.occurredAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p className="mt-1 text-sm leading-6">{item.summary}</p>
            {condensed ? (
              <p className="text-muted mt-1 text-xs">
                <Link
                  href={`/risks/${item.riskId}`}
                  className="hover:text-deep-green font-semibold"
                >
                  {item.riskTitle}
                </Link>
              </p>
            ) : (
              <p className="text-muted mt-1 text-xs">
                <Link
                  href={`/risks/${item.riskId}`}
                  className="hover:text-deep-green font-semibold"
                >
                  {item.riskTitle}
                </Link>
                {item.projectName ? ` · ${item.projectName}` : ""}
                {item.mentionedNames.length
                  ? ` · Mentioned ${item.mentionedNames.join(", ")}`
                  : ""}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
