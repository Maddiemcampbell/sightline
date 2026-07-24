"use client";

import { ErrorState } from "@/components/error-state";
import { SecondaryButton } from "@/components/ui/button";

export default function AuditViewerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Audit records unavailable"
      description="The internal audit ledger could not be loaded."
      action={<SecondaryButton onClick={reset}>Try again</SecondaryButton>}
    />
  );
}
