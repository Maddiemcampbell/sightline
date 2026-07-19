"use client";

import { ErrorState } from "@/components/error-state";
import { PrimaryButton } from "@/components/ui/button";

export default function BriefError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-10">
      <ErrorState
        title="We couldn’t prepare your Daily Brief"
        description="The underlying project data could not be loaded. Try again in a moment."
        action={<PrimaryButton onClick={reset}>Try again</PrimaryButton>}
      />
    </div>
  );
}
