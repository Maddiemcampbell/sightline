# Invite-only customer provisioning

## Near-term workflow

Sightline uses sales-assisted onboarding. `/request-access` creates only a
pre-tenant access request. It does not create a Supabase Auth identity,
organization, member, job schedule, storage allocation, or AI entitlement.

An operator with `platform.provisioning.manage` reviews requests at
`/internal/admin/provisioning`. In development and tests, the operator may use
the clearly labeled mock workflow. Simulated approval creates a
provider-neutral active billing account, records a sanitized billing event,
and issues a hashed, single-use Owner activation token that expires after seven
days. Rotating the invitation invalidates the previous link.

The designated owner follows `/activate/[token]`, establishes credentials
bound to the approved email, and completes provisioning. A security-definer
database function locks the request and atomically creates the organization,
application user, and first Owner membership. Repeated or expired activation
attempts cannot create another organization. Provisioning attempts and
operator actions are retained separately for support and audit purposes.

After activation, the Owner uses the existing Team Management invitation flow.
Those invitations now link to a trusted token-bound credential setup route.
Ordinary anonymous signup cannot create an account.

## Billing-provider boundary

Application provisioning depends on the neutral `BillingProvider` contract,
not Stripe-shaped records. The current `MockBillingProvider` creates explicitly
simulated identifiers and can run only outside production (except isolated E2E
builds). `BILLING_PROVIDER=mock` causes production environment validation to
fail, and the provider itself also rejects production execution.

When the business billing account is ready, implement a Stripe adapter using
hosted Checkout and verified webhooks. Stripe events should map into the same
billing statuses and sanitized event ledger. Webhook IDs must provide
idempotency; browser redirects must never grant provisioning eligibility.

Do not migrate simulated subscriptions as real financial agreements. Create a
real Stripe customer/subscription through an explicit commercial process and
reconcile its identifiers to the existing billing account.

## Production controls

Hosted Supabase must have general and email signup disabled. The repository's
local configuration does this, but hosted project settings must be verified
separately before launch. Login, password recovery, and trusted activation
remain available.

Production must use `BILLING_PROVIDER=stripe`; deployment is intentionally
blocked until that adapter exists. Never enable mock approval in a customer
environment. Neither Sightline nor its billing-event ledger stores card
numbers, bank details, credentials, full provider payloads, or payment secrets.

The public request endpoint uses strict validation, bounded fields, an active
company/owner deduplication constraint, and a honeypot. Add distributed rate
limiting and CAPTCHA before broad public exposure; local process rate limiting
would not protect a multi-instance deployment.

## Delinquency and deletion assumptions

Billing status remains separate from authorization. An active organization
membership is still the access boundary. Future Stripe work must define a
grace period and cost-control policy for past-due customers; it should not
delete customer data immediately. Cancellation should enter the documented
privacy-retention lifecycle, preserving customer export and recovery rights as
commercial policy allows.
