"use client";

import { ErrorState } from "@/components/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 lg:py-10">
      <ErrorState
        title="The company overview could not be loaded"
        description="Your data has not been changed. Try loading the dashboard again."
        {...(error.digest ? { reference: error.digest } : {})}
        action={
          <button
            onClick={reset}
            className="bg-deep-green min-h-10 rounded-md px-4 text-sm font-semibold text-white"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}
