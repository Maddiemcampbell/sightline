# Sightline V3.1 row-level security policy catalog

## Security boundary

Tenant isolation is enforced in two independent layers:

1. PostgreSQL RLS evaluates the authenticated Supabase user against
   `organization_memberships`.
2. Server data access resolves a verified request principal and active
   membership, uses the request's cookie-authenticated Supabase client so RLS
   remains active, and includes `organization_id` as defense in depth.

Client-side filtering is never an authorization control. The service-role key
bypasses RLS, so code using `createAdminSupabaseClient()` is treated as
privileged infrastructure and must always receive or derive an explicit
organization context. Its use is restricted to membership bootstrapping,
atomic organization lifecycle operations, and authenticated background jobs.

`public.is_organization_member(organization_id, auth_user_id)` is a stable,
security-definer predicate. It returns true only when the supplied Supabase Auth
user has a membership in the row's organization. Its empty-search-path and
restricted execute grants prevent object-shadowing and public invocation.

## Standard organization-owned policy set

The following tables use the same four policies:

| Operation | Policy                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `SELECT`  | `USING (is_organization_member(organization_id))`                                                             |
| `INSERT`  | `WITH CHECK (is_organization_member(organization_id))`                                                        |
| `UPDATE`  | Both `USING` and `WITH CHECK` require membership, preventing a row from being moved into another organization |
| `DELETE`  | `USING (is_organization_member(organization_id))`                                                             |

This standard policy set applies to:

| Table                        | Owned information                                |
| ---------------------------- | ------------------------------------------------ |
| `users`                      | Organization-scoped application profiles         |
| `projects`                   | Projects                                         |
| `vendors`                    | Vendors                                          |
| `project_vendors`            | Project/vendor relationships                     |
| `integration_sources`        | External integration configuration               |
| `documents`                  | Document metadata and storage paths              |
| `document_extracted_fields`  | Extracted document evidence                      |
| `document_activities`        | Upload, edit, and archive activity               |
| `project_detection_settings` | Organization project detection settings          |
| `detection_runs`             | Background detection executions                  |
| `ai_analysis_runs`           | AI input/output execution records                |
| `ai_risk_suggestions`        | AI-generated suggestions and review state        |
| `risks`                      | Risks                                            |
| `risk_evidence`              | Risk evidence                                    |
| `recommended_actions`        | Actions                                          |
| `risk_resolutions`           | Resolution records                               |
| `risk_email_drafts`          | Draft email content                              |
| `risk_conversations`         | Ask Sightline conversations                      |
| `risk_conversation_messages` | Conversation messages                            |
| `risk_answer_feedback`       | Answer feedback                                  |
| `risk_activities`            | Activity timeline and comments (`comment_added`) |
| `daily_briefs`               | Daily Brief headers                              |
| `brief_items`                | Daily Brief items                                |
| `daily_brief_deliveries`     | Brief delivery attempts                          |

Every child relationship also uses a composite foreign key containing
`organization_id` where the schema references another tenant-owned row. This
prevents a same-UUID or service-role write from linking records across tenants.

## Tenant-root and lifecycle tables

### `organizations`

- `SELECT`: members of that organization.
- `INSERT`: denied to normal authenticated SQL. The verified organization
  service calls the atomic `create_organization_for_user` service-role
  function.
- `UPDATE`: members may update only the granted `name`, `slug`, and `timezone`
  columns; both policy predicates require membership.
- `DELETE`: denied. Organization deletion is not implemented.

### `organization_memberships`

- `SELECT`: members may list memberships in their organizations.
- `INSERT`, `UPDATE`, `DELETE`: denied to direct authenticated SQL. Creation,
  invitation acceptance, and leaving use atomic, service-role-only functions
  after server-side principal and membership checks.

### `invitations`

- `SELECT`: organization members or the authenticated invitee email.
- `INSERT`, `UPDATE`, `DELETE`: denied to direct authenticated SQL.
  Invitation services verify the owner membership and use the service role.
  Tokens are random, single-use, expiring, and stored only as SHA-256 hashes.

## Audit logs

`audit_logs` is organization-owned and append-only:

- `SELECT`: organization members only.
- `INSERT`: organization members only; when `actor_auth_user_id` is provided,
  it must equal `auth.uid()`.
- `UPDATE`: explicitly denied with a false policy and no grant.
- `DELETE`: explicitly denied with a false policy and no grant.

Authentication events created before organization membership may have a null
organization and are insertable only by the server audit service. They are not
visible through organization-scoped RLS. A database trigger additionally
rejects every audit UPDATE and DELETE, including privileged application calls.

The table indexes organization/time and organization/resource for bounded audit
review. It is separate from user-facing `risk_activities`.

## Storage policies

The private `source-documents` bucket uses the path convention:

```text
<organization UUID>/<document UUID>/<sanitized filename>
```

Authenticated clients have no `storage.objects` policies for the private
`source-documents` bucket. They cannot list or access objects directly. Verified
server endpoints authorize the request and use a privileged Storage client only
for the individual upload, cleanup, or signed-URL operation.

The `documents_storage_path_organization_check` database constraint independently
requires each non-null document path to begin with its row's
`organization_id` and document `id`. A partial unique index prevents two
document records from claiming the same object.

Server uploads construct paths through `organizationStoragePath()`. Downloads
first query document metadata by the active organization, then verify the path
prefix before creating a 60-second signed URL.

## Privileged query audit

- Ordinary request repositories use the cookie-authenticated Supabase client,
  accept `ActorContext`, and filter reads, updates, and deletes by
  `context.organizationId`.
- Insert repositories either derive `organization_id` from `ActorContext` or
  reject a values object whose organization does not match it.
- The obsolete generic repository that accepted arbitrary organization IDs was
  removed.
- Internal email and evidence tooling now resolves the active request
  organization rather than seeded IDs.
- Daily Brief child queries include both `organization_id` and parent IDs.
- Delivery idempotency queries include `organization_id`.
- Detection-run, action, brief-item, and brief publication mutations include
  `organization_id`.

## Background jobs

Cron authentication authorizes the job runner, not a tenant. After that:

- detection loads membership-backed job targets and invokes the worker once per
  explicit `{ organizationId, actorUserId }` context;
- email delivery enumerates organizations and invokes the delivery worker once
  per explicit organization;
- every query inside those workers includes that organization ID;
- results are never combined before tenant-specific data access completes.

Organizations are processed sequentially to keep context boundaries obvious
and to prevent accidental shared mutable state.

## Isolation tests

`supabase/tests/tenant_isolation.test.sql` creates two organizations and proves
under the authenticated role that Organization A:

- sees its own project and cannot select Organization B's project;
- cannot insert, update, or delete Organization B data;
- sees its own storage objects and cannot select, upload to, or delete objects
  under Organization B's prefix;
- can append its own audit event but cannot update or delete audit history.

Vitest additionally verifies exact storage-prefix behavior, prefix-confusion
rejection, explicit per-organization background-job dispatch, and centralized
organization authorization.
