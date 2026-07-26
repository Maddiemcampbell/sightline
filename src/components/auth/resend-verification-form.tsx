"use client";

import { useActionState } from "react";

import {
  resendVerificationEmail,
  type AuthActionState,
} from "@/app/auth/actions";
import { SecondaryButton } from "@/components/ui/button";

const initialState: AuthActionState = {};

export function ResendVerificationForm({
  email,
  next,
}: Readonly<{ email: string; next: string }>) {
  const [state, action, pending] = useActionState(
    resendVerificationEmail,
    initialState,
  );
  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      {state.message ? (
        <p
          role={state.error ? "alert" : "status"}
          className={`mb-4 rounded-md p-3 text-sm ${
            state.error
              ? "bg-soft-red text-danger"
              : "bg-background text-deep-green"
          }`}
        >
          {state.message}
        </p>
      ) : null}
      <SecondaryButton type="submit" disabled={pending}>
        {pending ? "Sending…" : "Resend verification email"}
      </SecondaryButton>
    </form>
  );
}
