"use client";

import { ImagePlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type FieldErrors = Record<string, string[] | undefined>;

export function BugReportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(formData: FormData) {
    setErrors({});
    setMessage("");
    setPending(true);
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("correlationId", crypto.randomUUID());
    formData.set("relevantRoute", pathname);
    formData.set("viewportWidth", String(window.innerWidth));
    formData.set("viewportHeight", String(window.innerHeight));
    formData.set(
      "browserOs",
      `${navigator.platform || "unknown"} · ${navigator.userAgent.slice(0, 350)}`,
    );
    const recentErrorReference = sessionStorage.getItem(
      "sightline:last-error-reference",
    );
    if (
      recentErrorReference &&
      /^[a-zA-Z0-9._:-]{1,240}$/.test(recentErrorReference)
    )
      formData.set("clientErrorReference", recentErrorReference);
    try {
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as {
        fieldErrors?: FieldErrors;
        message?: string;
        attachmentWarning?: string;
      };
      if (!response.ok) {
        if (body.fieldErrors) {
          setErrors(body.fieldErrors);
          requestAnimationFrame(() =>
            formRef.current
              ?.querySelector<HTMLElement>("[aria-invalid=true]")
              ?.focus(),
          );
        }
        setMessage(body.message ?? "We could not save the report. Try again.");
        return;
      }
      setMessage(
        body.attachmentWarning ??
          "Thanks — your report was sent to the Sightline team.",
      );
      if (!body.attachmentWarning) {
        formRef.current?.reset();
        setIdempotencyKey(crypto.randomUUID());
      }
    } catch {
      setMessage(
        "We could not save the report. Check your connection and retry.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="bug-report-title"
      onClose={onClose}
      onCancel={(event) => event.preventDefault()}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="backdrop:bg-ink/45 m-auto max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border-0 bg-white p-0 shadow-2xl"
    >
      <div className="border-border sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5">
        <div>
          <h2 id="bug-report-title" className="text-xl font-semibold">
            Report a problem
          </h2>
          <p className="text-muted mt-1 text-sm">
            Tell us what went wrong. Only the title and description are
            required.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close problem report"
          className="hover:bg-background grid size-10 place-items-center rounded-md"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
        className="space-y-5 px-6 py-5"
      >
        <Field name="title" label="Title" required error={errors.title?.[0]} />
        <Field
          name="description"
          label="What happened?"
          required
          multiline
          error={errors.description?.[0]}
        />
        <Field
          name="stepsToReproduce"
          label="Steps to reproduce"
          multiline
          error={errors.stepsToReproduce?.[0]}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="expectedBehavior" label="Expected behavior" multiline />
          <Field name="actualBehavior" label="Actual behavior" multiline />
        </div>
        <Field name="relevantFeature" label="Relevant feature or workflow" />
        <label className="block text-sm font-semibold">
          How disruptive is this? <span className="text-muted">(optional)</span>
          <select
            name="severity"
            className="border-border mt-2 min-h-11 w-full rounded-md border bg-white px-3 font-normal"
          >
            <option value="">Choose a severity</option>
            <option value="blocking">Blocking — cannot continue work</option>
            <option value="major">Major — important work is impaired</option>
            <option value="minor">Minor — workaround is available</option>
            <option value="cosmetic">Cosmetic — visual issue only</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Screenshot <span className="text-muted">(optional, max 5 MB)</span>
          <span className="border-border mt-2 flex min-h-12 items-center gap-2 rounded-md border px-3 font-normal">
            <ImagePlus aria-hidden="true" className="text-muted size-4" />
            <input
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-sm"
            />
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            name="diagnosticConsent"
            value="true"
            type="checkbox"
            className="mt-1"
          />
          <span>
            Share browser, operating system, and viewport diagnostics. Sightline
            never includes document contents, passwords, or access tokens.
          </span>
        </label>
        {message ? (
          <p role="status" className="text-deep-green text-sm font-medium">
            {message}
          </p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-border min-h-11 rounded-md border px-4 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            disabled={pending}
            className="bg-deep-green min-h-11 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send report"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Field({
  name,
  label,
  required,
  multiline,
  error,
}: {
  name: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  error?: string | undefined;
}) {
  const id = `bug-${name}`;
  const className =
    "border-border mt-2 min-h-11 w-full rounded-md border px-3 py-2 font-normal focus-visible:outline-2 focus-visible:outline-deep-green";
  return (
    <label htmlFor={id} className="block text-sm font-semibold">
      {label}{" "}
      {!required ? <span className="text-muted">(optional)</span> : null}
      {multiline ? (
        <textarea
          id={id}
          name={name}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          rows={3}
          className={className}
        />
      ) : (
        <input
          id={id}
          name={name}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={className}
        />
      )}
      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-1 block text-sm text-red-700"
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
