# Sightline privacy and deletion policy

## Scope and authority

All lifecycle decisions flow through `PrivacyService`. Organization retention
changes require `canManageOrganization`; organization deletion requires an Owner;
account deletion is self-service but is rejected while the user is the last Owner
of any organization.

Client-side confirmation is usability protection only. Server validation requires
the exact organization name or `DELETE MY ACCOUNT`. The database and service
remain the enforcement boundary.

## Retention defaults

- Soft-deletion grace period: 30 days, configurable from 7–90 days.
- Archived documents: 7 years by default.
- Activity: 3 years.
- AI conversations: 1 year.
- Audit evidence: 7 years.
- Deleted comment tombstones: 30 days.

Only archived documents are removed by ordinary document retention. Active
documents remain until archived or the tenant receives a full deletion request.
Audit retention is recorded as policy but automated audit deletion is intentionally
disabled until legal requirements and export obligations are finalized.

## Deletion modes

### User only

The request applies to the authenticated account across every organization.
At expiry, Sightline anonymizes application-user names, email addresses, and titles;
removes memberships and project assignments through cascades; and deletes the
Supabase Auth user. Authored business records remain with a “Deleted user”
identity where they are required for organizational history.

### Organization only

At expiry, Sightline removes memberships and invitations, anonymizes organization
branding and identity, and marks the tenant archived. Projects and business
records remain quarantined with no interactive memberships. This supports a
separate later full-data purge or a legally controlled preservation workflow.

### Organization plus all related data

The worker deletes private Storage objects first, in bounded batches, then deletes
the organization. Foreign-key cascades remove projects, risks, actions, document
metadata, evidence, activity, comments, AI conversations, notifications, briefs,
memberships, invitations, and related tenant data.

Audit records do not cascade. Their organization and actor references become null,
and the final deletion audit stores only hashed identifiers, request ID, scope, and
timestamps. This is the minimum evidence currently assumed appropriate for
security and legal accountability.

## Countdown and cancellation

Requests are soft-deleted state until `scheduled_for`. Settings display the exact
deadline and remaining days. A scheduled request can be cancelled by its requester
or an organization Owner. Once a worker claims the request and status becomes
`processing`, cancellation is no longer accepted.

## Cleanup and idempotency

`GET /api/cron/privacy-cleanup` requires the existing constant-time cron secret.
The database claim function uses `FOR UPDATE SKIP LOCKED`, so concurrent workers
cannot claim the same request. Completed and cancelled requests are never claimed.
Failed requests retry up to five times after a backoff; stale processing claims can
be recovered after one hour.

Storage removal is safe to repeat. If an organization was deleted before a worker
could mark completion, a recovered run treats the missing tenant as already
deleted, writes de-identified completion evidence, and completes the request.

The same job applies ordinary retention to archived documents, activity, expired
AI conversations, and deleted comments. Legal hold blocks both retention cleanup
and permanent deletion.

## Legal hold assumptions

The schema includes a legal-hold flag and all cleanup paths honor it. The UI is
read-only. Activation, release, reason, custodian, and legal approval workflows
are placeholders for a later controlled feature; they must not be implemented as
a casual organization setting.

## Operational requirements

- Schedule the cleanup route at least daily.
- Alert on `cleanup_failed`, exhausted retries, and stale processing requests.
- Back up the deletion-request ledger and retained audit evidence separately.
- Validate Storage deletion and cascade coverage whenever a new tenant-owned table
  or bucket is introduced.
- Review retention defaults and retained audit metadata with counsel before general
  availability.
