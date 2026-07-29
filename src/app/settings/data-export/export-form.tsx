"use client";

import { useActionState } from "react";
import {
  requestDataExportAction,
  type DataExportActionState,
} from "@/app/settings/data-export/actions";
import { PrimaryButton } from "@/components/ui/button";

export function DataExportForm() {
  const initial: DataExportActionState = { message: "" };
  const [state, action, pending] = useActionState(
    requestDataExportAction,
    initial,
  );
  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold">Export format</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <FormatOption
            value="csv"
            title="CSV"
            description="One spreadsheet-safe CSV per dataset in a ZIP package."
          />
          <FormatOption
            value="json"
            title="JSON"
            description="A structured JSON document for programmatic use."
          />
          <FormatOption
            value="zip"
            title="ZIP package"
            description="CSV files, JSON data, and the manifest together."
          />
        </div>
      </fieldset>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Requesting…" : "Request export"}
      </PrimaryButton>
      {state.error && (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-deep-green text-sm font-semibold">
          {state.message}
        </p>
      )}
    </form>
  );
}

function FormatOption({
  value,
  title,
  description,
}: {
  value: "csv" | "json" | "zip";
  title: string;
  description: string;
}) {
  return (
    <label className="border-border has-[:checked]:border-deep-green has-[:checked]:bg-mint/30 rounded-lg border p-4">
      <span className="flex items-center gap-2 font-semibold">
        <input
          type="radio"
          name="format"
          value={value}
          defaultChecked={value === "zip"}
        />
        {title}
      </span>
      <span className="text-muted mt-2 block text-sm">{description}</span>
    </label>
  );
}
