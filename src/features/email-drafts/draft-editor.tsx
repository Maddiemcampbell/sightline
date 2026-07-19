"use client";

import { useState, useTransition } from "react";
import { Check, Clipboard, Save } from "lucide-react";

import {
  markEmailDraftSentAction,
  saveEmailDraftAction,
} from "@/app/risks/[riskId]/email-draft/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

type Contact = { key: string; name: string; email: string; role: string };

export function DraftEditor({
  draft,
  contacts,
}: {
  draft: {
    id: string;
    subject: string;
    body: string;
    status: "draft" | "manually_sent";
    recipient_user_id: string | null;
    recipient_vendor_id: string | null;
  };
  contacts: readonly Contact[];
}) {
  const initialContact = draft.recipient_user_id
    ? `user:${draft.recipient_user_id}`
    : draft.recipient_vendor_id
      ? `vendor:${draft.recipient_vendor_id}`
      : "";
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [contactKey, setContactKey] = useState(initialContact);
  const [status, setStatus] = useState(draft.status);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = status === "manually_sent";

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await saveEmailDraftAction({
          draftId: draft.id,
          subject,
          body,
          contactKey: contactKey || null,
        });
        setMessage("Draft saved.");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Draft could not be saved.",
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <label className="block text-sm font-semibold">
        Known contact
        <select
          aria-label="Known contact"
          value={contactKey}
          disabled={locked || pending}
          onChange={(event) => setContactKey(event.target.value)}
          className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
        >
          <option value="">Select a contact</option>
          {contacts.map((contact) => (
            <option key={contact.key} value={contact.key}>
              {contact.name} — {contact.role} ({contact.email})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Subject
        <input
          aria-label="Email subject"
          value={subject}
          disabled={locked || pending}
          maxLength={240}
          onChange={(event) => setSubject(event.target.value)}
          className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
        />
      </label>
      <label className="block text-sm font-semibold">
        Body
        <textarea
          aria-label="Email body"
          value={body}
          disabled={locked || pending}
          rows={16}
          maxLength={10000}
          onChange={(event) => setBody(event.target.value)}
          className="border-border bg-surface mt-2 w-full rounded-md border p-3 leading-6 font-normal"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton
          disabled={locked || pending || !subject.trim() || !body.trim()}
          onClick={save}
        >
          <Save className="size-4" /> Save draft
        </PrimaryButton>
        <SecondaryButton
          onClick={async () => {
            await navigator.clipboard.writeText(
              `Subject: ${subject}\n\n${body}`,
            );
            setMessage("Draft copied.");
          }}
        >
          <Clipboard className="size-4" /> Copy draft
        </SecondaryButton>
        {!locked && (
          <SecondaryButton
            disabled={pending || !subject.trim() || !body.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await saveEmailDraftAction({
                    draftId: draft.id,
                    subject,
                    body,
                    contactKey: contactKey || null,
                  });
                  await markEmailDraftSentAction(draft.id);
                  setStatus("manually_sent");
                  setMessage("Saved and marked as sent manually.");
                } catch (caught) {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "Status could not be updated.",
                  );
                }
              });
            }}
          >
            <Check className="size-4" /> Mark as sent manually
          </SecondaryButton>
        )}
      </div>
      {message && (
        <p role="status" className="text-deep-green text-sm font-semibold">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
