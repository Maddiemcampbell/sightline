# Sightline Platform Administration

`/internal/admin` is a staff-only operations application. It uses the shared
Sightline design system, but it does not use the customer workspace shell,
organization membership, or organization authorization roles.

## Security boundary

- A Supabase Auth session establishes identity.
- The identity must have an active `platform_operators` record.
- Capabilities are individually assigned in
  `platform_operator_permissions`; there is no super-admin flag.
- The proxy performs an early active-operator check for every admin request.
- The nested layout validates the operator again on the server.
- Every page validates its specific capability before rendering.
- Operator and customer membership are mutually exclusive and enforced by
  database triggers in both directions.
- `mfa_required` is present for future MFA enforcement. Production operator
  onboarding should require MFA before real support capabilities are enabled.

Unauthorized access is returned as not found to avoid disclosing the existence
of the staff console.

## Local access

After resetting the local database, create a dedicated local staff identity:

```bash
npm run dev:bootstrap-platform-operator
```

Then log in using the credentials printed by the command and open
`http://localhost:3000/internal/admin`. Do not assign this identity to a customer
organization.

## Platform audit

`platform_audit_logs` is append-only and separate from customer audit and
activity records. It captures operator, action, resource, optional organization
and affected user, IP address, user agent, request ID, outcome, and metadata.
Authentication, route views, directory searches, and refresh actions use the
same reusable audit writer.

## Customer directories

Organizations and customer Auth accounts are connected to production data
through two purpose-built, minimized read models:

- `platform_organization_directory` exposes account identity, safe aggregate
  counts, storage totals, activity recency, and operational failure counts.
- `platform_user_directory` exposes safe Auth account metadata and membership
  aggregates. Staff platform operators are explicitly excluded.

Both views are selectable only by `service_role`. Browser sessions, including
authenticated customer sessions, have no direct grants. The server repository
uses stable secondary ID ordering, bounded page sizes, indexed name/email
search, and field-specific selection for secondary detail sections.

The `/internal/admin/organizations` and `/internal/admin/users` routes support
server-side filtering, sorting, pagination, refresh, and read-only detail
pages. Cross-links are capability gated: organization members require
`platform.users.read`, user memberships require
`platform.organizations.read`, and safe activity requires
`platform.audit.read`.

Global search accepts exact IDs and email addresses plus partial names and
emails. It requires at least two characters unless the value is a UUID,
neutralizes PostgREST structural characters, debounces browser requests, ranks
exact matches first, and returns at most ten results.

## Data minimization and unavailable fields

The directory does not expose customer documents, evidence, risk content,
financial details, AI prompts/responses, credentials, tokens, cookies, or raw
audit metadata. Search audit records contain only a normalized SHA-256 query
hash, search type, query length, and result count—not the raw query.

Plan/billing state, support-case counts, AI token usage, active session counts,
recent failed-login aggregates, privacy-cleanup failure aggregates, and generic
data-processing failure aggregates do not have authoritative application data
sources yet. Those fields are shown as unavailable rather than inferred or
fabricated. Invitation status is displayed on account detail pages because
pending invitations are not Auth users and therefore do not belong in the user
directory.

## Audit behavior and failure policy

Directory list views, record views, membership sections, invitation sections,
safe activity sections, and global searches create platform audit records.
Denied access and repository failures are also recorded. Failure records use a
non-sensitive reason code and never copy exception text into metadata.

For a sensitive staff read, audit persistence is fail-closed: if the platform
audit writer cannot persist its event, the request fails rather than returning
the customer record without a trace. Detail-page secondary sections fail
independently, so a job or audit-source outage does not falsely make the core
customer account appear missing.

## Customer health

`/internal/admin/customer-health` is a content-free operational read model for
authorized operators. Login recency comes from the latest organization-member
Auth login. Organization activity comes from throttled membership activity and
safe audit-event counts. Job failures cover organization jobs and terminal data
export failures from the last 30 days.

Onboarding completion uses five explicit organization milestones: create a
project, add a vendor, upload document metadata, create a risk, and generate a
Daily Brief. Feature adoption reports use of seven core capabilities: projects,
vendors, documents, risks, accepted action management, Ask Sightline, and Daily
Briefs. These indicators are operational heuristics, not customer sentiment or
commercial health scores.

## Remaining platform scope

Jobs, AI observability, health, support, feature flags, releases, and some
overview values remain Phase 1 placeholders. Future production services must
preserve capability checks, minimized DTOs, and platform auditing when
replacing them. No impersonation, membership mutation, organization mutation,
password reset, session termination, or other support write is available from
the directories.
