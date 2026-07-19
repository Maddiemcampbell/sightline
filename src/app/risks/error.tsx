"use client";

import { ErrorState } from "@/components/error-state";
import { SecondaryButton } from "@/components/ui/button";

export default function RisksError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <ErrorState
        title="Risks could not be loaded"
        description="Sightline could not retrieve the risk register."
        action={<SecondaryButton onClick={reset}>Try again</SecondaryButton>}
      />
    </div>
  );
}
