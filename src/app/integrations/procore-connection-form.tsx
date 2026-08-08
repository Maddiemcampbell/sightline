"use client";

import { useActionState } from "react";

import { connectProcoreAction, type ProcoreActionState } from "./actions";

const initialState: ProcoreActionState = {};

export function ProcoreConnectionForm() {
  const [state, action, pending] = useActionState(
    connectProcoreAction,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-5 space-y-4 rounded-lg border bg-white p-5"
    >
      <div>
        <label htmlFor="procore-company-id" className="text-sm font-semibold">
          Procore company ID
        </label>
        <input
          id="procore-company-id"
          name="companyId"
          required
          className="border-border mt-1 min-h-11 w-full rounded-md border px-3"
          placeholder="123456"
        />
      </div>
      <div>
        <label htmlFor="procore-company-name" className="text-sm font-semibold">
          Company name
        </label>
        <input
          id="procore-company-name"
          name="companyName"
          required
          className="border-border mt-1 min-h-11 w-full rounded-md border px-3"
          placeholder="BuildCo Construction"
        />
      </div>
      <div>
        <label htmlFor="procore-environment" className="text-sm font-semibold">
          Environment
        </label>
        <select
          id="procore-environment"
          name="environment"
          defaultValue="sandbox"
          className="border-border mt-1 min-h-11 w-full rounded-md border px-3"
        >
          <option value="sandbox">Sandbox</option>
          <option value="production">Production</option>
        </select>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Use connection-specific credentials
        </summary>
        <p className="text-muted mt-2 text-xs">
          Leave these blank when the server environment provides the Procore
          DMSA credentials.
        </p>
        <div className="mt-3 space-y-3">
          <input
            name="clientId"
            className="border-border min-h-11 w-full rounded-md border px-3"
            placeholder="Procore client ID"
            autoComplete="off"
          />
          <input
            name="clientSecret"
            type="password"
            className="border-border min-h-11 w-full rounded-md border px-3"
            placeholder="Procore client secret"
            autoComplete="new-password"
          />
        </div>
      </details>
      {state.error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-deep-green text-sm font-semibold">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-deep-green min-h-11 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Connecting…" : "Connect Procore"}
      </button>
    </form>
  );
}
