"use client";

import { useActionState } from "react";

import {
  createProjectAction,
  type CreateProjectState,
} from "@/app/projects/new/actions";
import { PrimaryButton } from "@/components/ui/button";

const initialState: CreateProjectState = {};
const inputClass =
  "border-border bg-surface text-ink mt-2 min-h-11 w-full rounded-md border px-3 text-sm";

function FieldError({
  errors,
}: Readonly<{ errors: readonly string[] | undefined }>) {
  return errors?.[0] ? (
    <p role="alert" className="text-danger mt-1.5 text-sm">
      {errors[0]}
    </p>
  ) : null;
}

export function CreateProjectForm() {
  const [state, action, pending] = useActionState(
    createProjectAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="project-name" className="text-sm font-semibold">
            Project name
          </label>
          <input
            id="project-name"
            name="name"
            autoComplete="organization"
            maxLength={200}
            required
            className={inputClass}
          />
          <FieldError errors={state.fieldErrors?.name} />
        </div>
        <div>
          <label htmlFor="project-number" className="text-sm font-semibold">
            Project number
          </label>
          <input
            id="project-number"
            name="projectNumber"
            maxLength={80}
            required
            className={inputClass}
          />
          <FieldError errors={state.fieldErrors?.projectNumber} />
        </div>
        <div>
          <label htmlFor="project-state" className="text-sm font-semibold">
            State
          </label>
          <input
            id="project-state"
            name="stateCode"
            maxLength={2}
            placeholder="CA"
            className={`${inputClass} uppercase`}
          />
          <FieldError errors={state.fieldErrors?.stateCode} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="project-address" className="text-sm font-semibold">
            Street address <span className="text-muted">(optional)</span>
          </label>
          <input
            id="project-address"
            name="addressLine1"
            autoComplete="street-address"
            maxLength={240}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="project-city" className="text-sm font-semibold">
            City <span className="text-muted">(optional)</span>
          </label>
          <input
            id="project-city"
            name="city"
            autoComplete="address-level2"
            maxLength={120}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="project-postal" className="text-sm font-semibold">
            Postal code <span className="text-muted">(optional)</span>
          </label>
          <input
            id="project-postal"
            name="postalCode"
            autoComplete="postal-code"
            maxLength={20}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="project-start" className="text-sm font-semibold">
            Start date <span className="text-muted">(optional)</span>
          </label>
          <input
            id="project-start"
            name="startDate"
            type="date"
            className={inputClass}
          />
          <FieldError errors={state.fieldErrors?.startDate} />
        </div>
        <div>
          <label htmlFor="project-completion" className="text-sm font-semibold">
            Target completion <span className="text-muted">(optional)</span>
          </label>
          <input
            id="project-completion"
            name="targetCompletionDate"
            type="date"
            className={inputClass}
          />
          <FieldError errors={state.fieldErrors?.targetCompletionDate} />
        </div>
      </div>
      {state.message ? (
        <p
          role="alert"
          className="bg-soft-red text-danger rounded-md p-3 text-sm"
        >
          {state.message}
        </p>
      ) : null}
      <PrimaryButton
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? "Creating project…" : "Create first project"}
      </PrimaryButton>
    </form>
  );
}
