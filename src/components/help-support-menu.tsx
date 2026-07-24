import { Bug, LifeBuoy, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function HelpSupportMenu() {
  return (
    <details className="group relative">
      <summary className="text-muted hover:bg-background hover:text-ink grid size-10 cursor-pointer list-none place-items-center rounded-md transition-colors [&::-webkit-details-marker]:hidden">
        <LifeBuoy aria-hidden="true" className="size-5" />
        <span className="sr-only">Help and support</span>
      </summary>
      <div className="border-border bg-surface shadow-surface absolute top-12 right-0 z-50 w-72 rounded-lg border p-2">
        <p className="px-3 py-2 text-sm font-semibold">Help &amp; Support</p>
        <a
          href="mailto:support@sightline.app?subject=Sightline%20support%20request"
          className="hover:bg-background flex items-start gap-3 rounded-md px-3 py-2.5"
        >
          <Bug className="text-deep-green mt-0.5 size-4" aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold">
              Report a problem
            </span>
            <span className="text-muted mt-0.5 block text-xs">
              Include what you clicked and any support reference.
            </span>
          </span>
        </a>
        <Link
          href="/settings/privacy"
          className="hover:bg-background flex items-start gap-3 rounded-md px-3 py-2.5"
        >
          <ShieldCheck
            className="text-deep-green mt-0.5 size-4"
            aria-hidden="true"
          />
          <span>
            <span className="block text-sm font-semibold">
              Privacy &amp; Trust Center
            </span>
            <span className="text-muted mt-0.5 block text-xs">
              Review data handling, exports, and deletion controls.
            </span>
          </span>
        </Link>
        <p className="text-muted border-border mt-1 border-t px-3 pt-3 pb-2 text-xs">
          Never include passwords, session cookies, or document contents in a
          support report.
        </p>
      </div>
    </details>
  );
}
