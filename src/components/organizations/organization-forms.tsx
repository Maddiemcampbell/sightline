"use client";

import { useActionState } from "react";

import {
  acceptInvitationAction,
  createInvitationAction,
  createOrganizationAction,
  leaveOrganizationAction,
  updateOrganizationAction,
  type OrganizationActionState,
} from "@/app/organization/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

const initialState: OrganizationActionState = {};

function Message({ state }: Readonly<{ state: OrganizationActionState }>) {
  if (!state.message) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={
        state.error
          ? "bg-soft-red text-danger rounded-md p-3 text-sm"
          : "bg-soft-green text-deep-green rounded-md p-3 text-sm"
      }
    >
      {state.message}
    </p>
  );
}

function FieldError({
  errors,
}: Readonly<{ errors: readonly string[] | undefined }>) {
  return errors?.[0] ? (
    <p role="alert" className="text-danger mt-1.5 text-sm">
      {errors[0]}
    </p>
  ) : null;
}

const inputClass =
  "border-border bg-surface text-ink mt-2 min-h-11 w-full rounded-md border px-3 text-sm";

export function OrganizationProfileForm({
  mode,
  name = "",
  slug = "",
}: Readonly<{
  mode: "create" | "update";
  name?: string;
  slug?: string;
}>) {
  const action =
    mode === "create" ? createOrganizationAction : updateOrganizationAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="text-sm font-semibold">
          Organization name
        </label>
        <input
          className={inputClass}
          id="name"
          name="name"
          defaultValue={name}
          maxLength={160}
          required
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div>
        <label htmlFor="slug" className="text-sm font-semibold">
          Organization slug
        </label>
        <input
          className={inputClass}
          id="slug"
          name="slug"
          defaultValue={slug}
          maxLength={80}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
        <p className="text-muted mt-1.5 text-xs">
          Lowercase letters, numbers, and hyphens.
        </p>
        <FieldError errors={state.fieldErrors?.slug} />
      </div>
      <Message state={state} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create organization"
            : "Save organization"}
      </PrimaryButton>
    </form>
  );
}

export function InvitationForm() {
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="invitation-email" className="text-sm font-semibold">
          Email address
        </label>
        <input
          className={inputClass}
          id="invitation-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <Message state={state} />
      {state.invitationUrl ? (
        <div>
          <label htmlFor="invitation-link" className="text-sm font-semibold">
            Single-use invitation link
          </label>
          <input
            id="invitation-link"
            className={inputClass}
            value={state.invitationUrl}
            readOnly
          />
        </div>
      ) : null}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invitation"}
      </PrimaryButton>
    </form>
  );
}

export function AcceptInvitationForm({ token }: Readonly<{ token: string }>) {
  const action = acceptInvitationAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <Message state={state} />
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Joining…" : "Accept invitation"}
      </PrimaryButton>
    </form>
  );
}

export function LeaveOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    leaveOrganizationAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <p
          role="alert"
          className="bg-soft-red text-danger rounded-md p-3 text-sm"
        >
          {state.message}
        </p>
      ) : null}
      <SecondaryButton type="submit" disabled={pending}>
        {pending ? "Leaving…" : "Leave organization"}
      </SecondaryButton>
    </form>
  );
}
