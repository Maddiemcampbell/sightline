"use client";

import { useActionState } from "react";

import { PrimaryButton } from "@/components/ui/button";
import {
  setupInvitedAccountAction,
  type InvitationSetupState,
} from "./actions";

export function InvitationAccountSetupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    setupInvitedAccountAction,
    {} as InvitationSetupState,
  );
  return (
    <form action={action} className="mt-6 space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      {(
        [
          ["password", "Create password"],
          ["confirmPassword", "Confirm password"],
        ] as const
      ).map(([name, label]) => (
        <label key={name} className="block text-sm font-semibold">
          {label}
          <input
            name={name}
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
            className="border-border mt-2 min-h-11 w-full rounded-md border px-3"
          />
          {state.fieldErrors?.[name]?.[0] ? (
            <span role="alert" className="text-danger mt-1 block text-sm">
              {state.fieldErrors[name]![0]}
            </span>
          ) : null}
        </label>
      ))}
      {state.message ? (
        <p
          role="alert"
          className="bg-soft-red text-danger rounded-md p-3 text-sm"
        >
          {state.message}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Preparing account…" : "Continue to invitation"}
      </PrimaryButton>
    </form>
  );
}
