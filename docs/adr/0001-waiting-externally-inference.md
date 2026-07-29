# ADR 0001: Infer “waiting externally” from action type

- Status: Accepted, with known limitation
- Date: 2026-07-28
- Owners: Sightline product and engineering
- Target for reconsideration: A future action-workflow release

## Context

The dashboard includes a “waiting externally” work queue. The current
`recommended_actions` schema models an action’s type, lifecycle status, owner,
priority, and due date, but it does not model:

- whether progress is blocked;
- whether the blocking party is internal or external;
- which person or organization is expected to respond;
- when a request was sent;
- when a response is expected or received; or
- whether the dependency was cleared independently of action completion.

Sightline therefore cannot determine “waiting externally” directly from stored
workflow state.

## Decision

For the current release, Sightline infers that a recommended action is waiting
externally when both conditions are true:

1. The action is nonterminal; its status is not `completed` or `dismissed`.
2. Its `action_type` is one of:
   - `contact_vendor`
   - `request_document`
   - `open_rfi`

This inference is implemented in
`src/features/dashboard/aggregation.ts`. It is a dashboard grouping only. It
does not change action status, trigger notifications, affect risk scoring, or
serve as an auditable statement that an external request was actually sent.

We are retaining this deterministic inference rather than adding workflow
fields before the product requires them. The current model keeps recommended
actions narrowly focused on resolving risks and avoids prematurely turning
Sightline into a general-purpose task-management system.

## Known limitation

Action type is an imperfect proxy for dependency state:

- A suggested action may appear in the queue before anyone sends the request.
- A user may be actively drafting or preparing a request rather than waiting.
- An `open_rfi` action may still require internal review before submission.
- A response may have arrived while the action remains open.
- Other action types may genuinely be blocked by an owner, customer,
  consultant, authority, insurer, or vendor but will not appear.
- The model cannot show who owes the response, how long the team has waited, or
  whether the response is late.

The queue must consequently be presented as an operational prompt, not a
guaranteed or contractually authoritative classification. Analytics, alerts,
and AI grounding must not treat this inferred grouping as direct evidence of an
external dependency.

## Consequences

### Positive

- No migration or behavioral change is required for the current release.
- The queue remains deterministic and inexpensive to calculate.
- Existing action lifecycle and audit behavior remain unchanged.

### Negative

- False positives and false negatives are possible.
- Reliable wait-duration and external-response metrics cannot be calculated.
- Automated reminders or escalation based on this inference would be unsafe.

## Future schema proposal

When validated customer workflows require explicit dependency tracking, add a
risk-scoped action dependency record rather than overloading `action_type` or
adding more action statuses:

```sql
create table public.action_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  recommended_action_id uuid not null,
  state text not null
    check (state in ('waiting', 'received', 'cancelled')),
  party_type text not null
    check (party_type in (
      'organization_user',
      'vendor',
      'owner',
      'consultant',
      'authority',
      'insurer',
      'other'
    )),
  party_user_id uuid,
  party_vendor_id uuid,
  party_label text,
  requested_at timestamptz not null,
  response_due_at timestamptz,
  responded_at timestamptz,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (recommended_action_id, organization_id)
    references public.recommended_actions(id, organization_id)
    on delete cascade
);
```

Before implementation, refine this proposal with these requirements:

- Use organization-scoped composite foreign keys and existing project-access
  authorization.
- Require exactly one structured party reference when the party is a known
  organization user or vendor; retain `party_label` for other parties.
- Record dependency transitions in the append-only risk activity timeline.
- Derive “waiting externally” from an active `waiting` dependency, not action
  type.
- Preserve action lifecycle independently: waiting is a blocking condition,
  not a replacement for `suggested`, `accepted`, or `in_progress`.
- Index active dependencies by organization, response due date, and action.
- Migrate no historical inference as fact. Existing actions should remain
  “unknown” until a user or trusted integration records a dependency.

## Reconsideration triggers

Revisit this decision when any of the following becomes a committed product
requirement:

- reminders or escalations for unanswered external requests;
- reporting on external response time;
- multiple dependencies for one recommended action;
- integration-sourced RFI, submittal, or document-request status; or
- users consistently correcting the inferred queue.
