"use client";

import { useActionState } from "react";

import {
  saveDataExportScheduleAction,
  type DataExportScheduleActionState,
} from "@/app/settings/data-export/actions";
import { PrimaryButton } from "@/components/ui/button";

export type ExportScheduleFormValues = Readonly<{
  enabled: boolean;
  exportFormat: "csv" | "json" | "zip";
  cadence: "daily" | "weekly" | "monthly";
  localTime: string;
  weekday: number;
  dayOfMonth: number;
  timezone: string;
}>;

export function DataExportScheduleForm({
  values,
}: {
  values: ExportScheduleFormValues;
}) {
  const initial: DataExportScheduleActionState = { message: "" };
  const [state, action, pending] = useActionState(
    saveDataExportScheduleAction,
    initial,
  );
  return (
    <form action={action} className="mt-5 space-y-5">
      <label className="flex items-start gap-3 rounded-lg border p-4">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={values.enabled}
          className="mt-1"
        />
        <span>
          <span className="block font-semibold">Enable recurring exports</span>
          <span className="text-muted mt-1 block text-sm">
            Sightline creates the export on schedule and notifies you when it is
            ready.
          </span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Format">
          <select
            name="exportFormat"
            defaultValue={values.exportFormat}
            className={inputClass}
          >
            <option value="csv">CSV package</option>
            <option value="json">JSON</option>
            <option value="zip">ZIP package</option>
          </select>
        </Field>
        <Field label="Frequency">
          <select
            name="cadence"
            defaultValue={values.cadence}
            className={inputClass}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <Field label="Local time">
          <input
            name="localTime"
            type="time"
            defaultValue={values.localTime.slice(0, 5)}
            className={inputClass}
            required
          />
        </Field>
        <Field label="Weekly day">
          <select
            name="weekday"
            defaultValue={String(values.weekday)}
            className={inputClass}
          >
            {[
              [0, "Sunday"],
              [1, "Monday"],
              [2, "Tuesday"],
              [3, "Wednesday"],
              [4, "Thursday"],
              [5, "Friday"],
              [6, "Saturday"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monthly day">
          <select
            name="dayOfMonth"
            defaultValue={String(values.dayOfMonth)}
            className={inputClass}
          >
            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Timezone">
          <input
            name="timezone"
            defaultValue={values.timezone}
            className={inputClass}
            required
          />
        </Field>
      </div>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save recurring schedule"}
      </PrimaryButton>
      {state.error ? (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-deep-green text-sm font-semibold">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

const inputClass =
  "border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 text-sm";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}
