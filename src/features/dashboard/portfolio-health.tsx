"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { PortfolioHealthRow } from "@/features/dashboard/types";
import { formatMoney } from "@/features/daily-brief/formatters";

type SortKey = "concern" | "exposure" | "margin" | "risks" | "name";

export function PortfolioHealth({
  projects,
}: {
  projects: readonly PortfolioHealthRow[];
}) {
  const [sort, setSort] = useState<SortKey>("concern");
  const rows = projects.toSorted((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "margin")
      return (
        (a.projectedMarginCents ?? Number.MAX_SAFE_INTEGER) -
        (b.projectedMarginCents ?? Number.MAX_SAFE_INTEGER)
      );
    if (sort === "risks") return b.openRiskCount - a.openRiskCount;
    if (sort === "exposure") return b.exposureCents - a.exposureCents;
    return b.concernScore - a.concernScore;
  });

  if (!projects.length)
    return (
      <p className="text-muted py-6 text-sm">
        No active projects are available for portfolio review.
      </p>
    );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <label className="text-muted text-xs font-medium">
          Sort projects
          <select
            aria-label="Sort portfolio"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="border-border bg-surface text-ink ml-2 min-h-10 rounded-md border px-3 text-sm"
          >
            <option value="concern">Highest concern</option>
            <option value="exposure">Estimated exposure</option>
            <option value="margin">Projected margin</option>
            <option value="risks">Open risk count</option>
            <option value="name">Project name</option>
          </select>
        </label>
      </div>
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-border bg-background/60 border-y">
              {[
                "Project",
                "Projected margin",
                "Open risks",
                "Est. exposure",
                "Risk trend",
                "Most important issue",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="text-muted px-5 py-3 text-xs font-semibold tracking-wide uppercase sm:px-6"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((project) => (
              <tr
                key={project.id}
                className="border-border border-b last:border-b-0"
              >
                <td className="px-5 py-4 sm:px-6">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-deep-green font-semibold hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-muted mt-1 text-xs">{project.location}</p>
                </td>
                <td className="px-5 py-4 font-medium whitespace-nowrap sm:px-6">
                  {project.projectedMarginCents === null
                    ? "Not available"
                    : formatMoney(project.projectedMarginCents)}
                </td>
                <td className="px-5 py-4 sm:px-6">{project.openRiskCount}</td>
                <td className="px-5 py-4 font-medium whitespace-nowrap sm:px-6">
                  {formatMoney(project.exposureCents)}
                </td>
                <td className="px-5 py-4 sm:px-6">
                  <Trend trend={project.trend} />
                </td>
                <td className="max-w-xs px-5 py-4 sm:px-6">
                  {project.topIssue ?? (
                    <span className="text-muted">No active risks</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Trend({ trend }: { trend: PortfolioHealthRow["trend"] }) {
  if (trend === "insufficient")
    return <span className="text-muted text-xs">Not enough history</span>;
  const Icon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        trend === "up"
          ? "text-danger"
          : trend === "down"
            ? "text-deep-green"
            : "text-muted"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {trend === "up" ? "Rising" : trend === "down" ? "Improving" : "Steady"}
    </span>
  );
}
