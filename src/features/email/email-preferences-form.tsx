"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  sendTestEmailAction,
  updateEmailPreferencesAction,
} from "@/app/settings/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

export function EmailPreferencesForm({
  enabled,
  preferredTime,
  timezone,
}: {
  enabled: boolean;
  preferredTime: string;
  timezone: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      enabled: formData.get("enabled") === "on",
      preferredTime: String(formData.get("preferredTime") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
    };
    run(async () => {
      await updateEmailPreferencesAction(input);
      setMessage("Email preferences saved.");
    });
  }

  function run(action: () => Promise<void>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setError(
          "The email update could not be completed. Check the configuration and try again.",
        );
      }
    });
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={enabled}
          disabled={pending}
          className="mt-1 size-4"
        />
        <span>
          <span className="block text-sm font-semibold">
            Send my Daily Brief by email
          </span>
          <span className="text-muted mt-1 block text-sm">
            One scheduled email per published brief.
          </span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Preferred delivery time
          <input
            required
            type="time"
            name="preferredTime"
            defaultValue={preferredTime.slice(0, 5)}
            disabled={pending}
            className="border-border mt-2 h-11 w-full rounded-md border px-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          Timezone
          <select
            name="timezone"
            defaultValue={timezone}
            disabled={pending}
            className="border-border mt-2 h-11 w-full rounded-md border px-3 font-normal"
          >
            {timezones.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message ? (
        <p role="status" className="text-deep-green text-sm">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <PrimaryButton type="submit" disabled={pending}>
          Save preferences
        </PrimaryButton>
        <SecondaryButton
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const result = await sendTestEmailAction();
              if (!result.success) {
                setError(result.error);
                return;
              }
              setMessage("Test email sent.");
            })
          }
        >
          Send test email
        </SecondaryButton>
      </div>
    </form>
  );
}

const timezones = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
] as const;
