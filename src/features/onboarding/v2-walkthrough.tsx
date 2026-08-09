import Link from "next/link";
import { BookOpen, ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";

const steps = [
  ["Review a risk", "/brief"],
  [
    "Inspect the evidence",
    "/risks/60000000-0000-4000-8000-000000000001?tab=evidence",
  ],
  [
    "Ask Sightline a question",
    "/risks/60000000-0000-4000-8000-000000000001?tab=ask",
  ],
  [
    "Accept a recommended action",
    "/risks/60000000-0000-4000-8000-000000000001?tab=actions",
  ],
  ["Assign an owner", "/actions"],
  [
    "Draft a communication",
    "/risks/60000000-0000-4000-8000-000000000001/email-draft",
  ],
  [
    "Resolve the risk",
    "/risks/60000000-0000-4000-8000-000000000001?tab=resolution",
  ],
] as const;

export function V2Walkthrough() {
  return (
    <Card className="border-deep-green/20 mb-7 overflow-hidden p-0 sm:p-0">
      <details className="group">
        <summary className="focus-visible:outline-accent-strong hover:bg-soft-green flex min-h-24 cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-4">
            <span className="bg-soft-green text-deep-green flex size-11 shrink-0 items-center justify-center rounded-full">
              <BookOpen className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">
                New to Sightline? Walk through the resolution workflow
              </span>
              <span className="text-muted mt-1 block text-sm font-normal">
                Open the guided 7-step walkthrough
              </span>
            </span>
          </span>
          <span className="border-deep-green/25 text-deep-green flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold">
            <span className="group-open:hidden">Open guide</span>
            <span className="hidden group-open:inline">Close guide</span>
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="border-border border-t px-5 pb-6 pt-5 sm:px-6">
          <p className="text-muted text-sm">
            Follow one grounded risk from executive review through documented
            resolution.
          </p>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map(([label, href], index) => (
              <li key={label}>
                <Link
                  href={href}
                  className="border-border hover:border-deep-green focus-visible:outline-accent-strong flex min-h-14 items-center gap-3 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-2"
                >
                  <span className="bg-accent text-ink flex size-6 shrink-0 items-center justify-center rounded-full text-xs">
                    {index + 1}
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </details>
    </Card>
  );
}
