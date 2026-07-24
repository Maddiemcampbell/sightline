# Sightline V3.1 production readiness

Review date: 2026-07-24

## Release decision

**Conditionally ready.** The application security boundaries are implemented and
the application gates pass locally. Production promotion still requires the
operational controls listed under “Release blockers” to be configured and
verified in the target Supabase and hosting projects.

## Security checklist

| Area | Status | Evidence |
| --- | --- | --- |
| Authentication | Pass | Supabase Auth; verified-email enforcement; password reset; server-side `getUser()` validation |
| Sessions | Pass | HTTP-only, SameSite=Lax, Secure-in-production cookies; refresh through SSR client |
| Route protection | Pass | Proxy provides early redirects; layouts and request helpers repeat validation |
| Authorization | Pass | Central capability service; service/action/route enforcement; future-role deny-by-default matrix |
| Tenant isolation | Pass | Organization context, repository predicates, foreign keys, RLS, and pgTAP isolation coverage |
| Uploads | Pass | Server authorization, 10 MB limit, signature/MIME validation, sanitized opaque paths, private bucket |
| Downloads/previews | Pass | Server authorization and ownership lookup; 60-second signed URLs; no public object paths |
| API routes | Pass | Authenticated principals, same-origin mutation checks, generic public errors, no-store responses |
| Server Actions | Pass | Principal and centralized capability checks; Next.js origin validation retained |
| Scheduled jobs | Pass | Required constant-time bearer secret, organization iteration, atomic email delivery claim |
| Secrets/environment | Pass | Server schema validation; required `APP_URL` and 32+ character `CRON_SECRET`; no tracked secrets |
| Headers | Pass | Nonce CSP, HSTS, frame denial, MIME sniff prevention, restrictive permissions and referrer policies |
| Caching | Pass | Authenticated and API responses are private/no-store; nonce responses are dynamic |
| CSRF | Pass | Same-origin `Origin`/Fetch Metadata checks on mutating route handlers; SameSite cookies |
| Rate limiting | Partial | Upload limit exists; Supabase Auth limits must be configured; general mutation/AI limits are operational work |
| Audit | Pass | Append-only audit table/service/viewer, correlation IDs, RLS, privileged viewer |
| Logging/errors | Partial | Public errors are sanitized; a production log sink, alerting, and redaction policy remain operational work |
| Dependencies | Pass with CI control | Next 16.2.10 and React 19.2.4 exceed reviewed security patch floors; registry audit must run in connected CI |

## Release blockers

These are deployment controls, not application-code defects:

1. Apply all V3 migrations to a staging clone, run `supabase test db`, and then
   promote them with a backup and rollback window.
2. Set production secrets in the host secret store: Supabase URL/keys,
   `APP_URL` (HTTPS), `CRON_SECRET`, AI provider key, Resend key, and sender.
3. Confirm the `source-documents` bucket is private and its direct client
   policies remain removed.
4. Configure Supabase email verification, redirect allowlists, SMTP, password
   recovery URLs, and provider rate limits.
5. Run `npm audit --omit=dev` (or an equivalent lockfile scanner) in networked
   CI. The review environment could not reach the npm registry.
6. Put cron routes behind the platform scheduler/firewall in addition to their
   bearer secret and configure centralized logs/alerts.

## Known risks

- Rate limits are process-local. A distributed limiter at the edge or in Redis
  is required before exposing AI and high-volume mutation endpoints broadly.
- There is no MFA or step-up authentication for organization owners.
- Cron organization work is sequential and has no distributed job lease.
  Email sends use provider idempotency plus an atomic database claim, but a
  crashed `sending` row currently requires operator recovery.
- AI requests and evidence snapshots can contain sensitive tenant content.
  Provider retention, training opt-out, residency, and deletion terms must be
  approved contractually.
- Audit retention, export, legal hold, and tamper-evident archival are not yet
  automated. Recommended default: 365 days online plus immutable archive based
  on contractual and regulatory needs.
- The active-organization cookie is an unsigned preference. It cannot grant
  access because every selection is revalidated against membership, but signing
  it would reduce nuisance tampering.
- Authorization currently has only Owner. Future roles are intentionally denied
  until their capability matrix and RLS mapping are explicitly implemented.

## Recommended improvements

1. Add distributed per-IP and per-principal limits for login-adjacent, AI,
   invitation, upload, and mutation traffic.
2. Add MFA/step-up authentication for member, organization, AI configuration,
   and other sensitive settings changes.
3. Add structured JSON logging with correlation IDs, field allowlists,
   centralized retention, alerts, and secret/PII redaction tests.
4. Add a distributed job lease, stale-send recovery, dead-letter handling, and
   delivery metrics for scheduled work.
5. Add SAST, secret scanning, lockfile vulnerability scanning, migration tests,
   and authenticated Playwright tests as required CI checks.
6. Exercise backup restore, tenant offboarding/export, key rotation, incident
   response, and audit export runbooks before general availability.

## Validation

The release gate is:

```text
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npx supabase test db
npm audit --omit=dev
```

Record the exact final results in the release ticket. Database reset during
Playwright applies every migration from zero and therefore also provides a
schema/seed smoke test. The standalone pgTAP and npm advisory commands must be
rerun in an environment allowed to write Supabase CLI telemetry and reach the
npm registry, respectively.

Final local results:

- ESLint: pass, zero warnings
- TypeScript: pass
- Vitest: 31 files, 158 tests passed
- Playwright: 18 tests passed, including authenticated setup
- Production build: pass with Next.js 16.2.10 webpack builder
- Migration reset/seed: pass through all V1–V3.1 migrations
- Diff whitespace validation: pass
- Turbopack build in this sandbox: environment failure because its CSS worker
  could not bind a local port; the supported webpack production build passed
- Standalone pgTAP: environment failure before test execution because the
  Supabase CLI could not write its telemetry file outside the workspace
- npm advisory audit: environment failure because the npm registry was
  unreachable; official framework advisories were reviewed manually
