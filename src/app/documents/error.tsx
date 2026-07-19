"use client";

import { ErrorState } from "@/components/error-state";
import { SecondaryButton } from "@/components/ui/button";

export default function DocumentsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <ErrorState
        title="Documents could not be loaded"
        description="Sightline could not retrieve the secure document library."
        action={<SecondaryButton onClick={reset}>Try again</SecondaryButton>}
      />
    </div>
  );
}
