"use client";

import { ErrorState } from "@/components/error-state";
import { SecondaryButton } from "@/components/ui/button";

export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <ErrorState
        title="Projects could not be loaded"
        description="Sightline could not retrieve the project portfolio."
        action={<SecondaryButton onClick={reset}>Try again</SecondaryButton>}
      />
    </div>
  );
}
