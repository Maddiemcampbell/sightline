# Onboarding reliability

Sightline resolves onboarding on the server after every successful password
login, auto-confirmed signup, and email callback. The resolver validates the
requested destination, loads authenticated memberships, selects the preferred
or first organization, and checks whether that organization has a project.

The resulting flow is:

1. An unauthenticated protected request is redirected to `/login` with a safe
   relative `next` path.
2. Login and signup links preserve that path. Signup also places it in the
   verification callback URL.
3. An account without a verified email is sent to `/verify-email`. Verification
   emails can be resent with a generic response, and the original destination
   remains intact.
4. A verified invitation link is handled before organization creation. The
   invitation RPC remains the atomic membership boundary. A mismatched account
   must log out before continuing as the invited address.
5. A verified user without memberships is sent to `/organizations/new`.
6. Organization creation atomically creates the Owner membership, selects the
   organization in an HTTP-only cookie, and opens `/projects/new`.
7. An organization without projects opens the first-project experience. Only
   Owners and Administrators can create a project; this is checked by the
   centralized authorization service, the server-side service, and PostgreSQL
   RLS.
8. Project creation uses the authenticated Supabase client, records an audit
   event, and opens the new project.
9. An established organization opens the requested protected page or the
   executive homepage.

## Reliability and security assumptions

- Redirect destinations must be same-origin relative paths. Authentication
  routes cannot recursively become post-auth destinations.
- Membership and project state are read on the server. Browser state does not
  decide organization access.
- The organization cookie is only a preference. Authenticated membership and
  RLS remain the security boundary.
- Organization creation and invitation acceptance continue to use their
  existing database RPCs so retries cannot create partial membership state.
- Project numbers are unique within an organization. Duplicate submissions
  return a field-level error.
- Invitation delivery remains link-based until transactional email delivery is
  connected. The raw token is never stored in the database.
