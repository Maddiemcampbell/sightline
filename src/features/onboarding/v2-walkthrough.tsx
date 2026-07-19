import Link from "next/link";

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
    <Card className="border-deep-green/15 mb-7">
      <details>
        <summary className="focus-visible:outline-accent-strong cursor-pointer list-none font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">
          New to Sightline? Walk through the resolution workflow
        </summary>
        <p className="text-muted mt-2 text-sm">
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
      </details>
    </Card>
  );
}
