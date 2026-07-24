# Sightline V3.1 authentication foundation

## Scope

This implementation establishes Supabase Auth, server-managed sessions, and a
verified request principal. It does not add memberships, organization routing,
centralized authorization, RLS policies, or new product behavior. Those remain
separate implementation phases.

## Request and session flow

1. `src/proxy.ts` runs on application requests. It reads the chunked Supabase
   session from secure, HTTP-only cookies, calls `auth.getUser()` to refresh and
   validate the session, and writes any refreshed session back to the response.
2. Proxy performs an optimistic redirect to `/login` for protected pages and
   returns `401` for unauthenticated protected API requests.
3. The root server layout independently calls `getCurrentUser()`. This makes a
   verified call to Supabase Auth and refuses to render protected application
   pages without an authenticated user. Proxy is not the sole security check.
4. Server actions and business-data request contexts use
   `requireAuthenticatedUser()`. The legacy application actor is looked up by
   the verified Supabase Auth user ID, rather than by a hard-coded identity.
5. `getCurrentSession()` first verifies the user with Supabase Auth, then only
   returns a session belonging to that verified user. Session data alone is not
   treated as proof of identity.
6. `getCurrentOrganization()` intentionally returns `null`. Membership and
   active-organization selection belong to the next V3.1 implementation phase.

## User flows

### Signup and email verification

`/signup` validates the email and password on the server and calls
`auth.signUp()`. Supabase sends its configured confirmation email to
`/auth/callback`. The callback exchanges the one-time PKCE code for a session
and sends the user to `/verify-email`.

Supabase email confirmation must remain enabled in hosted environments. The
production Supabase project's Site URL and redirect allowlist must include the
deployed Sightline URL and `/auth/callback`.

### Login and logout

`/login` calls `auth.signInWithPassword()` in a Server Action. A safe, relative
`next` path is preserved when a protected page redirects to login. Logout calls
`auth.signOut()`, clears the session cookies, and returns to `/login`.

### Password reset

`/forgot-password` calls `auth.resetPasswordForEmail()` and always returns a
non-enumerating success message. The email returns through `/auth/callback`,
which establishes the recovery session before `/reset-password` calls
`auth.updateUser()`.

## Reusable server API

- `getCurrentUser()` returns a verified, minimal request principal or `null`.
- `requireAuthenticatedUser()` returns that principal or redirects to login.
- `getCurrentSession()` returns a session only after its user is verified.
- `getCurrentOrganization()` is a deliberate placeholder for the membership
  phase and currently returns `null`.
- `createServerSupabaseClient()` is the publishable-key, cookie-backed client
  for user-scoped authentication calls.
- `createAdminSupabaseClient()` remains for existing business repositories
  during this isolated phase. It must not become the V3 security boundary.

## Cookie properties

The session is split into bounded cookie chunks to stay below browser cookie
size limits. Cookies are HTTP-only, `SameSite=Lax`, scoped to `/`, and marked
Secure in production. Server Components can read them; Server Actions, route
handlers, and Proxy can update them.

## Required Supabase configuration

- Enable email/password authentication.
- Require email confirmation in production.
- Configure a production SMTP provider and sender.
- Set the Site URL to the canonical Sightline origin.
- Add local and deployed `/auth/callback` URLs to the redirect allowlist.
- Set `APP_URL` to that same canonical origin in each environment.
- Keep the service-role key server-only; never expose it as `NEXT_PUBLIC_*`.

## Next phases

The next PR should introduce organization memberships and explicit organization
routing. A later PR should make centralized authorization and database RLS the
enforced security boundaries before any new V3.1 product behavior is added.
