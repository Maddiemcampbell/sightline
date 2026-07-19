# Sightline AI trust model

## Purpose and boundary

The V1 AI layer is a drafting assistant for construction risk review. It may
summarize supplied evidence, suggest a category and severity, estimate a
confidence score, and draft an explanation and next action. It cannot publish a
risk, change a risk, send a brief, retrieve external facts, or execute work.

Deterministic detection remains authoritative and is used as the fallback when
the configured model is unavailable or its output is invalid. A fallback result
still enters the same human review queue.

## Evidence grounding

- Every excerpt receives an application-controlled evidence ID.
- Every material output field must cite at least one of those IDs.
- Zod validates the response shape and allowed category/severity values.
- A second validator rejects citations absent from the supplied request.
- Approval copies only cited evidence into the active risk record.
- Monetary exposure is never invented by the model. An approved suggestion
  starts with zero exposure until a human supplies a supported amount.

## Prompt-injection safeguards

Document excerpts are untrusted data. Sightline normalizes control characters,
limits excerpt length, neutralizes common instruction-like phrases, serializes
the bounded context as JSON, and tells the provider that document content is
never an instruction. The provider has no tools, browsing, storage access, or
ability to call application actions. These controls reduce—not eliminate—the
risk of prompt injection, so human review remains mandatory.

## Review workflow

1. The provider receives project context, document excerpts, existing evidence,
   and related historical risks.
2. Sightline validates citations and stores the provider, model, prompt version,
   timestamp, latency, token usage, sanitized input, and structured output.
3. The output is stored as `pending`; it cannot enter the Daily Brief.
4. An authorized reviewer approves or rejects it. Rejection requires a reason.
5. Approval creates a `monitoring` risk, copies cited evidence, adds the drafted
   next action, and records the human approval in risk activity.

The `/internal/ai-review` route demonstrates this flow in development. It is
disabled in production until application authentication replaces the V1 seeded
user boundary.

## Known limitations

- Text sanitization cannot identify every adversarial or misleading passage.
- A valid citation proves that text was supplied, not that it is true.
- Confidence is a model suggestion, not a calibrated probability.
- Historical risks provide context but are not evidence for a current claim.
- The model does not calculate exposure, interpret legal obligations, forecast
  weather, or replace safety, insurance, legal, or project-management review.
- Review activation uses several database writes. A production version should
  wrap activation in a PostgreSQL transaction/RPC.

## V2 email drafting

Email drafting is a bounded, human-controlled use of the same provider
abstraction. The server assembles risk, project, vendor, recommended-action,
due-date, recipient-role, tone, and evidence context from organization-scoped
records. Client input never supplies tenant identity or risk facts. Document
excerpts pass through the existing prompt-injection sanitizer before generation.

The structured response includes subject, body, recipient role, urgency,
evidence IDs, and claim-level citations. Zod rejects malformed output. A second
grounding validator rejects unavailable evidence IDs, claims absent from the
draft, and claims that are not contained in their cited excerpt or evidence
explanation. Provider or validation failure produces a deterministic template
using only trusted structured context and the highest-relevance evidence.

Draft rows retain provider, model, prompt version, latency, token usage,
generation source, and evidence references. Users may edit, select a known
organization or vendor contact, copy, save, and mark a draft as sent manually.
Sightline has no email-sending capability in this workflow. Draft creation and
manual sent status append separate user-facing risk activity records.

## Evaluation fixtures

The fixture set covers expiring subcontractor insurance, a weather-sensitive
concrete pour, and repeated owner-directed work. Tests verify schema validity,
classifications, evidence rejection, injection neutralization, and provider
response and usage parsing.
