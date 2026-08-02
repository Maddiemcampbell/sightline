"use client";

import { useActionState } from "react";

import { requestAccessAction, type RequestAccessState } from "./actions";
import { PrimaryButton } from "@/components/ui/button";

const initialState: RequestAccessState = {};

export function RequestAccessForm() {
  const [state, action, pending] = useActionState(
    requestAccessAction,
    initialState,
  );
  if (state.success)
    return (
      <p role="status" className="bg-soft-green text-deep-green rounded-md p-4">
        {state.message}
      </p>
    );
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Field
        name="companyName"
        label="Company name"
        errors={state.fieldErrors?.companyName}
      />
      <Field
        name="ownerName"
        label="Your name"
        autoComplete="name"
        errors={state.fieldErrors?.ownerName}
      />
      <Field
        name="ownerEmail"
        label="Work email"
        type="email"
        autoComplete="email"
        errors={state.fieldErrors?.ownerEmail}
      />
      <label className="block text-sm font-semibold">
        Company size
        <select
          name="companySize"
          className="border-border mt-2 min-h-11 w-full rounded-md border bg-white px-3 font-normal"
        >
          <option value="">Select…</option>
          {["1-10", "11-50", "51-200", "201-500", "501+"].map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        What would you like Sightline to help with?{" "}
        <span className="font-normal text-slate-500">Optional</span>
        <textarea
          name="message"
          maxLength={2000}
          rows={4}
          className="border-border mt-2 w-full rounded-md border px-3 py-2 font-normal"
        />
      </label>
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Sending request…" : "Request access"}
      </PrimaryButton>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  errors,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  errors: readonly string[] | undefined;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(errors?.length)}
        className="border-border mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
      />
      {errors?.[0] ? (
        <span
          role="alert"
          className="text-danger mt-1 block text-sm font-normal"
        >
          {errors[0]}
        </span>
      ) : null}
    </label>
  );
}
