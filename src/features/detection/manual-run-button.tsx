"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { runDetectionManuallyAction } from "@/app/internal/detection/actions";
import { PrimaryButton } from "@/components/ui/button";

export function ManualDetectionButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <PrimaryButton
        disabled={pending}
        onClick={() => {
          setMessage(null);
          setError(null);
          startTransition(async () => {
            try {
              const result = await runDetectionManuallyAction();
              setMessage(
                `Run complete: ${result.created} created, ${result.updated} updated, ${result.briefItemCount} brief items.`,
              );
            } catch {
              setError(
                "Detection could not be completed. Check the server log.",
              );
            }
          });
        }}
      >
        <RefreshCw
          aria-hidden="true"
          className={pending ? "size-4 animate-spin" : "size-4"}
        />
        {pending ? "Running detection…" : "Run detection now"}
      </PrimaryButton>
      {message ? (
        <p role="status" className="text-deep-green mt-3 text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
