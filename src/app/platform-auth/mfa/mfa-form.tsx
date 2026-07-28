"use client";

import { useActionState } from "react";
import Image from "next/image";

import {
  beginMfaEnrollmentAction,
  verifyPlatformMfaAction,
  type MfaActionState,
} from "./actions";
import { PrimaryButton } from "@/components/ui/button";

const initialState: MfaActionState = {};

export function MfaEnrollmentForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    beginMfaEnrollmentAction,
    initialState,
  );
  if (state.enrollment)
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-white p-4 text-center">
          {/* Supabase returns a self-contained, short-lived QR data image. */}
          <Image
            src={state.enrollment.qrCode}
            alt="Authenticator enrollment QR code"
            width={208}
            height={208}
            unoptimized
            className="mx-auto size-52"
          />
          <p className="text-muted mt-3 text-xs">
            Can’t scan it? Enter this setup key:
          </p>
          <code className="mt-2 block rounded bg-slate-100 p-2 text-xs break-all">
            {state.enrollment.secret}
          </code>
        </div>
        <MfaVerificationForm
          factorId={state.enrollment.factorId}
          next={next}
          submitLabel="Verify and continue"
        />
      </div>
    );
  return (
    <form action={action}>
      {state.message ? (
        <p role="alert" className="text-danger mb-4 text-sm">
          {state.message}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Starting enrollment…" : "Set up authenticator"}
      </PrimaryButton>
    </form>
  );
}

export function MfaVerificationForm({
  factorId,
  next,
  submitLabel = "Verify identity",
}: {
  factorId: string;
  next: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    verifyPlatformMfaAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={next} />
      <label className="text-ink block text-sm font-semibold">
        Six-digit authentication code
        <input
          required
          autoFocus
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          className="border-border mt-2 min-h-11 w-full rounded-md border px-3 text-lg tracking-[0.3em]"
        />
      </label>
      {state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Verifying…" : submitLabel}
      </PrimaryButton>
    </form>
  );
}
