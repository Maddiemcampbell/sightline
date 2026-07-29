"use client";

import { Button } from "@/components/ui/button";

export default function TeamSettingsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-[var(--page-gutter)] py-16">
      <h1 className="text-2xl font-semibold">Team settings are unavailable</h1>
      <p className="text-muted mt-3">
        We could not load this organization’s members. No changes were made.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
