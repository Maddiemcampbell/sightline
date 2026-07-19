"use client";
import { ErrorState } from "@/components/error-state";
import { SecondaryButton } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="p-8">
      <ErrorState
        title="Activity could not be loaded"
        description="Try loading the timeline again."
        action={<SecondaryButton onClick={reset}>Try again</SecondaryButton>}
      />
    </main>
  );
}
