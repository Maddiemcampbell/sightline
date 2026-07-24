# Sightline V3.1 audit logging

## Purpose and boundary

`audit_logs` is an append-only internal security ledger. It is not
`risk_activities`:

- Activity explains product work to users.
- Audit records security-relevant facts for investigation, compliance, and
  incident response.

Product code must not write security events into the activity timeline or show
audit metadata in user-facing activity feeds.

## Record envelope

Every event stores:

- Supabase Auth user ID when known;
- organization application-user ID when one exists;
- organization ID when the event has tenant context;
- database-generated occurrence and creation timestamps;
- validated client IP when available;
- a controlled action name;
- resource type and optional UUID;
- success, denied, or failed outcome;
- bounded, event-specific JSON metadata; and
- a UUID correlation ID shared across a request or multi-record workflow.

Authentication attempts before organization membership use a null organization
and application user. Failed login and password-reset-request records store a
SHA-256 identifier hash rather than an email address. Passwords, reset tokens,
session tokens, invitation tokens, document contents, AI prompts, signed URLs,
and secrets must never be placed in metadata.

The IP resolver accepts only syntactically valid IP addresses. Forwarded
headers are trustworthy only when the production load balancer overwrites them;
the origin must not be publicly reachable with caller-supplied forwarding
headers.

## Event catalog

| Action                             | Emission point                                                              |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `auth.login`                       | Successful password, signup-session, or email link; failed password attempt |
| `auth.logout`                      | Before successful session termination                                       |
| `auth.password_reset_requested`    | After Supabase accepts the non-enumerating request                          |
| `auth.password_reset_completed`    | After the password update succeeds                                          |
| `invitation.created`               | After invitation persistence                                                |
| `invitation.accepted`              | After atomic invitation acceptance                                          |
| `organization.created`             | After organization and owner membership creation                            |
| `organization.updated`             | After profile persistence                                                   |
| `membership.created/deleted`       | Invitation acceptance and organization leave                                |
| `authorization.permission_changed` | Owner permission grant/removal caused by membership changes                 |
| `document.downloaded`              | After URL signing but before the URL is returned                            |
| `ai.review_updated`                | AI fixture analysis and suggestion review decisions                         |
| `settings.updated`                 | Email preferences and active organization changes                           |

There is currently no mutable AI-provider/model configuration endpoint.
`ai.configuration_changed` is a reserved, typed audit action and must be
emitted by the same service when that capability is introduced. It must record
changed field names, never API keys or secret values.

## Append-only enforcement

Application inserts use the server-only `AuditService` and `AuditLogRepository`.
Updates and deletes are blocked by:

1. absent authenticated grants;
2. explicit false RLS policies;
3. revoked service-role mutation grants; and
4. a database trigger that rejects every UPDATE or DELETE statement.

The trigger protects against accidental privileged-client mutation. The audit
viewer at `/internal/audit` is server-rendered, requires both internal-admin and
audit-view capabilities, uses the authenticated Supabase client, and remains
organization-scoped by RLS.

Audit writes occur after the protected state transition. Downloads fail closed
if their audit insert fails, so a signed URL is never returned without a
record. Multi-system state changes are not currently transactional with the
audit insert; production monitoring should alert immediately on audit-write
failures.

## Retention recommendation

Adopt a written policy with legal and customer approval. A reasonable starting
point is:

- 12 months queryable in the primary database;
- 24–84 months in encrypted, immutable archival storage when contractual,
  insurance, litigation-hold, or regulatory requirements justify it;
- shorter retention for IP addresses where privacy requirements demand data
  minimization; and
- immediate suspension of deletion for records under legal hold.

Partition the table by occurrence month before volume becomes material.
Retention deletion must be a separately reviewed DBA procedure: export and
verify the immutable archive, record the purge approval and range, temporarily
apply a purpose-built retention migration, delete whole expired partitions,
then restore append-only protections. Do not give the web application a purge
API.

Protect archives with encryption, restricted security-team access, integrity
checks, access logging, tested restoration, and geographic controls. Review the
policy at least annually and whenever customer contracts or applicable law
change.
