"use client";

import { useActionState } from "react";

import {
  startStripeCheckoutAction,
  type ProvisioningActionState,
} from "./actions";

export function StripeCheckoutForm({
  requestId,
  defaultSlug,
  checkoutUrl,
}: {
  requestId: string;
  defaultSlug: string;
  checkoutUrl: string | null;
}) {
  const [state, action, pending] = useActionState(
    startStripeCheckoutAction,
    {} as ProvisioningActionState,
  );
  const url = state.activationUrl ?? checkoutUrl;
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
          ? "Creating…"
          : checkoutUrl
            ? "Refresh Checkout"
            : "Create Checkout"}
      </button>
      {state.message ? (
        <p role="status" className="text-xs">
          {state.message}
        </p>
      ) : null}
      {url ? (
        <p className="max-w-72 text-xs break-all">
          <a
            className="font-semibold underline"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Open hosted Checkout
          </a>
        </p>
      ) : null}
    </form>
  );
}
