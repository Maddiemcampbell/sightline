"use client";

import { useActionState } from "react";
import {
  type SettingsActionState,
} from "@/app/settings/admin-actions";
import { PrimaryButton } from "@/components/ui/button";

export function SettingsForm({
  action,
  children,
  submitLabel = "Save changes",
}: {
  action: (state: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  return (
    <form action={formAction} className="space-y-5">
      {children}
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </PrimaryButton>
      {state.error && <p role="alert" className="text-danger text-sm">{state.error}</p>}
      {state.message && <p role="status" className="text-deep-green text-sm font-semibold">{state.message}</p>}
    </form>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
      />
      {help && <span className="text-muted mt-1 block text-xs font-normal">{help}</span>}
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select name={name} defaultValue={defaultValue} className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal">
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );
}

export function CheckField({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="border-border flex gap-3 rounded-md border p-4">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 size-4" />
      <span><strong className="block text-sm">{label}</strong><span className="text-muted text-xs">{description}</span></span>
    </label>
  );
}
