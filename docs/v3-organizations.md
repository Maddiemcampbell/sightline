# Sightline V3.1 organizations and memberships

## Scope and assumptions

- An authenticated Supabase user may belong to multiple organizations.
- Every initial membership is an `owner`. The membership role column is
  intentionally constrained to `owner`; role definitions and differentiated
  permissions are deferred.
- An organization may have multiple owners. The final owner cannot leave.
- Leaving removes the membership and disconnects the legacy application-user
  record from the Supabase identity. It does not delete the organization or its
  business data.
- Invitations expire after seven days, are bound to a normalized email address,
  are single-use, and store only a SHA-256 hash of the random token.
- Invitation delivery is not implemented. The settings screen produces a
  single-use URL for an owner to share securely.
- Organization deletion and ownership transfer are intentionally out of scope.
- The existing `public.users` table remains an organization-scoped application
  profile because many business-data foreign keys reference it. A membership
  links one Supabase identity to one such profile in each organization.

## Data model

`organizations` is the tenant root and now records the creating Supabase user.

`organization_memberships` links:

- one organization;
- one Supabase Auth user;
- one organization-scoped `public.users` application profile;
- the initial `owner` membership value.

The unique `(organization_id, auth_user_id)` constraint permits the same
Supabase identity in multiple organizations while preventing duplicate
membership in one organization. The old global uniqueness constraint on
`users.auth_user_id` is replaced by organization-scoped uniqueness.

`invitations` records the organization, normalized email, hashed token,
inviting membership, expiry, acceptance, and revocation state. A partial unique
index prevents multiple pending invitations for the same email and
organization.

## Organization ownership

The existing schema already assigns `organization_id` to every requested data
area:

- projects and vendors;
- risks, actions, evidence, resolutions, and activity;
- documents, extracted fields, and document activity;
- AI analysis, suggestions, conversations, messages, and feedback;
- Daily Briefs, brief items, and deliveries;
- detection runs, project detection settings, email drafts, and integrations.

Composite foreign keys continue to prevent references between organizations.
Membership-aware RLS policies now require `is_organization_member()` for reads
and writes on every tenant table.

## Request flow

The active organization ID is stored in the HTTP-only
`sightline-organization` cookie. On every server request:

1. Supabase Auth verifies the request principal.
2. The server loads every membership for that Auth user.
3. The cookie is accepted only if it names one of those memberships.
4. Otherwise, the first membership becomes the request default.
5. Users without a membership are redirected to `/organizations/new` when a
   business-data context is required.
6. `requireActorContext()` obtains the application user and organization only
   from the verified current membership.

The switch action repeats the membership check on the server before changing
the cookie. Client-submitted organization IDs are never trusted directly.

## Atomic operations

Organization creation, invitation acceptance, and leaving are implemented as
database functions so organization, profile, membership, and invitation state
change atomically. The functions are executable only by the service role and
are called after server-side authentication and service authorization.

## Authorization

Organization management uses one centralized organization authorization
module. Currently `canManageOrganization()` returns true only for an owner
membership. Because owner is the only allowed membership value, every member
can update the organization, invite owners, and leave subject to the final-owner
invariant.

The service-role repositories remain an implementation bridge for existing
business services. They are not the authorization boundary: request services
verify membership first, while RLS enforces tenant isolation for authenticated
database access.
