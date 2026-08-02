# Production configuration and onboarding validation

## Current connection status

This workspace is not linked to a hosted Supabase project or deployment
provider. Its configured Supabase URL and `APP_URL` are local-only. Production
credentials must therefore be installed in the hosting provider and Supabase
Dashboard by a project operator; they must never be written to this repository.

Run `npm run validate:production-env` in the production build/deployment
environment. The command prints variable names and validation failures only,
never values.

## Application environment contract

| Variable                               | Exposure     | Production requirement                              |
| -------------------------------------- | ------------ | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser-safe | Hosted Supabase HTTPS URL                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe | Publishable key for the same project                |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server-only  | Service-role key for the same project               |
| `CRON_SECRET`                          | Server-only  | Independent random secret of at least 32 characters |
| `APP_URL`                              | Server-only  | Canonical public HTTPS origin with no path          |
| `RESEND_API_KEY`                       | Server-only  | Restricted production transactional-email key       |
| `EMAIL_FROM`                           | Server-only  | Sender on the verified production domain            |
| `OPENAI_API_KEY`                       | Server-only  | Restricted production project key                   |
| `OPENAI_MODEL`                         | Server-only  | Approved model identifier                           |
| `INTERNAL_ADMIN_AUTH_USER_IDS`         | Server-only  | Comma-separated platform-operator Auth UUIDs        |

Generate `CRON_SECRET` with a cryptographically secure generator such as
`openssl rand -base64 48`. Do not reuse Supabase, Resend, OpenAI, or deployment
credentials. Store secrets separately for Production and Preview environments.
Preview must use a non-production Supabase project.

## Supabase Auth production settings

In the hosted Supabase Dashboard:

1. Disable general and email signup. Customer identities are created only by
   trusted, token-bound Owner activation or organization invitation flows.
2. Set Site URL to the exact value of `APP_URL`.
3. Add `${APP_URL}/auth/callback` to the production redirect allowlist. Add
   preview origins separately; avoid wildcard production origins.
4. Connect a custom SMTP provider. For Resend, verify a dedicated sending
   subdomain and use its Supabase integration or SMTP credentials.
5. Use a sender such as `Sightline <accounts@updates.example.com>` on that
   verified domain.
6. Disable provider link tracking for Auth messages so single-use links are not
   rewritten.
7. Set the minimum password length to 12 and require uppercase, lowercase,
   digits, and symbols.
8. Keep refresh-token rotation and double-confirm email changes enabled.
9. Review recovery, verification, and email-delivery rate limits.
10. Add distributed rate limiting and CAPTCHA to `/request-access` before broad
    public exposure.
11. Review confirmation and recovery templates. Templates using a custom
    redirect must honor Supabase's `RedirectTo` value.

The Resend API configuration used by Sightline invitation and Daily Brief
emails is separate from Supabase Auth SMTP. Both configurations must pass.

## Real-email onboarding acceptance test

Use two controlled, real inboxes on different addresses: one for the
organization Owner and one for the invitee.

1. Submit `/request-access` and confirm that it creates no Auth user,
   organization, membership, storage allocation, or scheduled work.
2. Review the request in `/internal/admin/provisioning`. Complete payment with
   the real billing provider; never use mock approval in production.
3. Configure Stripe Checkout with `STRIPE_SECRET_KEY` and recurring
   `STRIPE_ESSENTIAL_PRICE_ID` and `STRIPE_PROFESSIONAL_PRICE_ID` values. Register `https://<app-origin>/api/stripe/webhook` for
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`, then set its signing secret as
   `STRIPE_WEBHOOK_SECRET`.
4. Treat Checkout return URLs as display-only. Only a verified webhook may
   activate billing and issue the private Owner invitation.

## Launch plan entitlements

- Essential includes five active projects.
- Professional includes ten active projects.
- Archived projects do not consume capacity; restore is blocked at the plan limit.
- Both launch plans support one organization per user and do not expose organization switching.
- Downgrades preserve all projects but block create/restore while active usage exceeds the new limit.

5. Confirm receipt of the private Owner activation email, sender domain,
   SPF/DKIM alignment, branding, HTTPS URL, and absence of link rewriting.
6. Open the activation link once and establish Owner credentials. Confirm the
   organization and first Owner membership are created exactly once.
7. Create the first project. Confirm it opens and remains after a fresh login.
8. Invite the second inbox from Team settings. Confirm receipt of the Sightline
   invitation email and that the displayed fallback link matches the message.
9. In a separate private browser session, open the invitation and establish
   credentials through its token-bound setup page.
10. Accept the invitation. Confirm the membership and active organization are
    created once, including after refresh or a repeated submission.
11. Verify the invitee cannot accept while authenticated as the Owner and that
    Switch accounts returns to the same invitation.
12. Request a password reset for each account. Confirm the recovery link opens
    `/reset-password`, including for an account without another membership.
13. Confirm expired and already-used confirmation, invitation, and recovery
    links show safe errors.
14. Inspect Supabase Auth logs, Resend delivery events, Sightline audit records,
    and application error reporting for the same test timestamps.

Record message IDs and timestamps, but do not put raw links, tokens, passwords,
API keys, or session cookies in test evidence.

## Completion evidence required

Production onboarding is accepted only after recording:

- deployed application origin and release identifier;
- hosted Supabase project reference;
- verified sender domain and SMTP provider;
- successful Owner confirmation, invitation, and password-recovery message IDs;
- successful organization and first-project IDs;
- negative permission and wrong-account results;
- screenshots with tokens and personal information redacted.
