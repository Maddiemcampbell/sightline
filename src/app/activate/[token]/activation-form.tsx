"use client";

import { useActionState } from "react";

import { PrimaryButton } from "@/components/ui/button";
import { activateCustomerOwnerAction, type ActivationState } from "./actions";

export function CustomerOwnerActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    activateCustomerOwnerAction,
    {} as ActivationState,
  );
  return (
    <form action={action} className="mt-6 space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <PasswordField
        name="password"
        label="Create password"
        error={state.fieldErrors?.password?.[0]}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        error={state.fieldErrors?.confirmPassword?.[0]}
      />
      {state.message ? (
        <p
          role="alert"
          className="bg-soft-red text-danger rounded-md p-3 text-sm"
        >
          {state.message}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Setting up workspace…" : "Set up workspace"}
      </PrimaryButton>
    </form>
  );
}

function PasswordField({
  name,
  label,
  error,
}: {
  name: string;
  label: string;
  error: string | undefined;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        aria-invalid={Boolean(error)}
        className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
      />
      {error ? (
        <span
          role="alert"
          className="text-danger mt-1 block text-sm font-normal"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
