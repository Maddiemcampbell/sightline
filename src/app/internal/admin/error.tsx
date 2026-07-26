"use client";

import { useEffect } from "react";

import { PrimaryButton } from "@/components/ui/button";

export default function PlatformAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Platform administration error", error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 text-center">
      <h1 className="text-2xl font-semibold">Admin view could not be loaded</h1>
      <p className="mt-3 text-sm text-slate-600">
        No platform operation was performed. Retry the view or use the request
        reference when investigating the failure.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-slate-500">
          Request reference: {error.digest}
        </p>
      ) : null}
      <PrimaryButton onClick={reset} className="mt-6">
        Try again
      </PrimaryButton>
    </div>
  );
}
