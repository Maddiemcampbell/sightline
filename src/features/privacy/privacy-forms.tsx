"use client";

import { useActionState, useState } from "react";
import type { PrivacyActionState } from "@/app/settings/privacy/actions";
import { PrimaryButton } from "@/components/ui/button";

export function PrivacyForm({
  action,
  children,
  submitLabel,
  destructive = false,
}: {
  action: (state: PrivacyActionState, formData: FormData) => Promise<PrivacyActionState>;
  children: React.ReactNode;
  submitLabel: string;
  destructive?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  const [confirmed, setConfirmed] = useState(!destructive);
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {destructive && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          I understand this operation becomes permanent after the countdown.
        </label>
      )}
      <PrimaryButton type="submit" disabled={pending || !confirmed}>
        {pending ? "Saving…" : submitLabel}
      </PrimaryButton>
      {state.error && <p role="alert" className="text-danger text-sm">{state.error}</p>}
      {state.message && <p role="status" className="text-deep-green text-sm font-semibold">{state.message}</p>}
    </form>
  );
}
