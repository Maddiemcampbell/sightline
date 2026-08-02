"use client";

import { useActionState } from "react";

import {
  approveMockCustomerAction,
  type ProvisioningActionState,
} from "./actions";

export function MockApprovalForm({
  requestId,
  defaultSlug,
  rotate,
}: {
  requestId: string;
  defaultSlug: string;
  rotate: boolean;
}) {
  const [state, action, pending] = useActionState(
    approveMockCustomerAction,
    {} as ProvisioningActionState,
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="accessRequestId" value={requestId} />
      <label className="block text-xs font-semibold">
        Organization slug
        <input
          name="slug"
          defaultValue={defaultSlug}
          required
          className="mt-1 min-h-9 w-full rounded-md border border-slate-300 px-2 font-normal"
        />
      </label>
      {state.fieldErrors?.slug?.[0] ? (
        <p role="alert" className="text-danger text-xs">
          {state.fieldErrors.slug[0]}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending
          ? "Processing…"
          : rotate
            ? "Rotate Owner invitation"
            : "Simulate payment and invite"}
      </button>
      {state.message ? (
        <p
          role="status"
          className={
            state.success ? "text-xs text-emerald-800" : "text-danger text-xs"
          }
        >
          {state.message}
        </p>
      ) : null}
      {state.activationUrl ? (
        <p className="max-w-72 text-xs break-all">
          <strong>Private activation link:</strong> {state.activationUrl}
        </p>
      ) : null}
    </form>
  );
}
