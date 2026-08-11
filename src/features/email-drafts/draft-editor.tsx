"use client";

import { useState, useTransition } from "react";
import { Check, Clipboard, Mail, Save } from "lucide-react";

import {
  markEmailDraftSentAction,
  saveEmailDraftAction,
} from "@/app/risks/[riskId]/email-draft/actions";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";

type Contact = { key: string; name: string; email: string; role: string };

export function DraftEditor({
  draft,
  contacts,
  requestedCommitment,
  expectedResponseDate,
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
  requestedCommitment: string;
  expectedResponseDate: string;
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
  const [trackFollowUp, setTrackFollowUp] = useState(true);
  const [commitment, setCommitment] = useState(requestedCommitment);
  const [responseDate, setResponseDate] = useState(expectedResponseDate);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = status === "manually_sent";
  const selectedContact = contacts.find(
    (contact) => contact.key === contactKey,
  );
  const dirty =
    subject !== draft.subject ||
    body !== draft.body ||
    contactKey !== initialContact;

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
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Mail className="text-deep-green size-5" aria-hidden="true" />
        <h2 className="font-semibold">Email composer</h2>
        {dirty && !locked ? (
          <span className="text-warning ml-auto text-xs font-semibold">
            Unsaved changes
          </span>
        ) : null}
      </div>
      <div className="border-border overflow-hidden rounded-lg border">
        <label className="border-border grid border-b sm:grid-cols-[5rem_1fr] sm:items-center">
          <span className="text-muted px-4 pt-3 text-sm font-semibold sm:py-3">
            To
          </span>
          <select
            aria-label="Email recipient"
            value={contactKey}
            disabled={locked || pending}
            onChange={(event) => setContactKey(event.target.value)}
            className="bg-surface min-h-12 w-full border-0 px-4 font-normal outline-none"
          >
            <option value="">Select a contact</option>
            {contacts.map((contact) => (
              <option key={contact.key} value={contact.key}>
                {contact.name} — {contact.role} ({contact.email})
              </option>
            ))}
          </select>
        </label>
        {selectedContact ? (
          <p className="text-muted border-border border-b px-4 pb-3 text-xs sm:pl-[6rem]">
            {selectedContact.email} · {selectedContact.role}
          </p>
        ) : null}
        <label className="border-border grid border-b sm:grid-cols-[5rem_1fr] sm:items-center">
          <span className="text-muted px-4 pt-3 text-sm font-semibold sm:py-3">
            Subject
          </span>
          <input
            aria-label="Email subject"
            value={subject}
            disabled={locked || pending}
            maxLength={240}
            onChange={(event) => setSubject(event.target.value)}
            className="bg-surface min-h-12 w-full border-0 px-4 font-normal outline-none"
          />
        </label>
        <label className="block">
          <span className="sr-only">Body</span>
          <textarea
            aria-label="Email body"
            value={body}
            disabled={locked || pending}
            rows={16}
            maxLength={10000}
            onChange={(event) => setBody(event.target.value)}
            className="bg-surface min-h-[28rem] w-full resize-y border-0 p-4 leading-7 font-normal outline-none sm:p-5"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
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
          <div className="border-border bg-background w-full rounded-lg border p-4">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input
                type="checkbox"
                checked={trackFollowUp}
                onChange={(event) => setTrackFollowUp(event.target.checked)}
                className="size-4"
              />
              Track the requested commitment after sending
            </label>
            {trackFollowUp ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <label className="text-sm font-semibold">
                  Commitment requested
                  <input
                    aria-label="Commitment requested"
                    value={commitment}
                    maxLength={1000}
                    onChange={(event) => setCommitment(event.target.value)}
                    className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Expected response
                  <input
                    aria-label="Expected response date"
                    type="date"
                    value={responseDate}
                    onChange={(event) => setResponseDate(event.target.value)}
                    className="border-border bg-surface mt-2 min-h-11 w-full rounded-md border px-3 font-normal"
                  />
                </label>
              </div>
            ) : null}
            <p className="text-muted mt-3 text-xs leading-5">
              Sightline will remind the owner if no verified response is
              recorded by this date.
            </p>
          </div>
        )}
        {!locked && (
          <SecondaryButton
            disabled={
              pending ||
              !subject.trim() ||
              !body.trim() ||
              (trackFollowUp && (!commitment.trim() || !responseDate))
            }
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
                  await markEmailDraftSentAction(
                    draft.id,
                    trackFollowUp
                      ? {
                          requestedCommitment: commitment,
                          expectedResponseAt: `${responseDate}T17:00:00.000Z`,
                        }
                      : undefined,
                  );
                  setStatus("manually_sent");
                  setMessage(
                    trackFollowUp
                      ? "Sent manually and follow-up tracking started."
                      : "Saved and marked as sent manually.",
                  );
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
            <Check className="size-4" />
            {trackFollowUp
              ? "Mark sent & track follow-up"
              : "Mark as sent manually"}
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
