# Sightline Beta Readiness Report

Review date: 2026-07-24  
Audience: product, engineering, security, customer success, and the first five
external design partners

## Executive decision

**Controlled design-partner beta: conditionally ready.** Sightline has credible
application-level security boundaries, mature tenant controls for its stage, and
a coherent customer experience. It may onboard a very small number of
contracted, high-touch design partners after the P0 launch blockers below are
closed.

**Open public beta: not ready.** The current environment lacks production
monitoring and alerting, verified scheduler operations, backup-restore evidence,
distributed abuse controls, finalized legal/provider assurances, and the current
Next.js security patch.

### P0 blockers before any external customer data

1. Upgrade Next.js from `16.2.10` to `16.2.11` or later in the Active LTS line,
   rerun the complete gate, and deploy the rebuilt artifact. The official July
   2026 security release directs 16.2 users to 16.2.11 to address multiple HIGH
   and MEDIUM severity issues. Registry access was unavailable in this review
   environment, so the patch could not be installed.
2. Configure a centralized error/log sink, alerts, redaction rules, and an
   on-call destination. A user-facing error reference is now displayed, but it
   is not useful operationally until server errors and correlation IDs reach a
   searchable system.
3. Configure and observe all four schedules: risk detection, Daily Brief email,
   privacy cleanup, and data exports. Alert on failed/exhausted/stale work.
4. Complete a production backup and restore drill, including Supabase Storage,
   and record recovery time and recovery point objectives.
5. Approve the privacy notice, terms, subprocessor list, AI provider DPA/training
   terms, retention defaults, privacy inbox, and incident contacts. Trust Center
   placeholders must not be represented as final terms.
6. Run a connected lockfile vulnerability scan and secret scan in CI. Local
   `npm audit --omit=dev` could not reach the npm registry.

## Review method

The review traced server-side request principals, organization and project
authorization, RLS migrations and pgTAP coverage, repositories, Server Actions,
route handlers, private Storage access, audit and notification services,
privacy/export workers, internal tools, error boundaries, feature flags,
documentation, and production build behavior. It also exercised the full
database, unit, and browser gates from a clean schema.

## Domain assessment

| Domain | Status | Strengths | Remaining beta risk |
| --- | --- | --- | --- |
| Authentication | Conditional pass | Supabase Auth, verified email, password reset, refreshable HTTP-only sessions, server-side `getUser()` validation | MFA and step-up authentication are absent; production SMTP, redirect allowlists, recovery, and Auth rate limits require verification |
| Authorization | Pass for pilot | Central capability matrix, role-aware services, repeated checks in actions/routes, project access helpers | Service-role repositories make application checks critical; add negative integration coverage whenever a mutation is introduced |
| Organization isolation | Pass | Organization foreign keys, RLS, organization predicates, project membership enforcement, cross-tenant pgTAP tests | New tables/buckets require a mandatory tenant-boundary checklist; staging must run tests against production-equivalent policies |
| Team collaboration | Pass for pilot | Owner/Admin/Manager/Contributor roles, project roles, invitations, comments, mentions, assignments, activity, notifications | Realtime presence is lightweight; notification delivery is in-app only; complex ownership/support recovery remains manual |
| Data lifecycle | Conditional pass | Configurable retention, reversible deletion countdowns, idempotent claims, legal-hold blocking placeholder, deletion audit evidence | Audit purge is intentionally not automated; legal hold has no approval/custodian workflow; cleanup alerts and restore exercises are missing |
| Customer exports | Pass for small tenants | Async queue, private bucket, manifests, checksums, CSV/JSON/ZIP, signed URLs, expiry, notifications, audit trail | Worker builds the entire export in memory and has no streaming/size preflight; suitable only for bounded pilot tenants |
| Privacy controls | Conditional pass | Live retention, user/org deletion, cancellation, ownership guards, documented assumptions | Counsel must approve defaults and retained audit evidence; privacy operations need rehearsed support procedures |
| Trust Center | Conditional pass | Plain-language AI/data/document commitments, live policy state, export/deletion visibility, explicit placeholders | Legal documents, dates, subprocessor list, accessibility statement, and privacy inbox are not production-approved |
| Admin console | Improved/conditional | Customer settings are role protected; internal tools now require both organization capability and a server-side Auth UUID allowlist | No dedicated platform-admin identity, support case ledger, or audited break-glass workflow; avoid impersonation for beta |
| Error reporting | Partial | Sanitized customer errors, route-specific boundaries, retry states, support digest on the root error boundary | No centralized exception capture, release tags, source maps, alerting, or error-rate SLO |
| AI trust | Conditional pass | Bounded organization/project context, evidence grounding, schema validation, deterministic fallbacks, human-controlled workflows, usage metadata | Provider contractual assurances must match Trust Center claims; evaluation fixtures are narrow; no continuous hallucination/prompt-injection evaluation |
| Monitoring | Fail/blocker | Public liveness endpoint and audit records exist | No readiness/dependency health, metrics, tracing, dashboards, synthetic checks, or alert routing |
| Background jobs | Conditional | Constant-time cron bearer checks; queue claims and stale recovery for privacy/exports; email idempotency | No platform scheduler configuration in repo, dead-letter UI, queue-depth metrics, or operator recovery console |
| Feature flags | Weak | A typed V2 flag parser exists and defaults off | Flags are not wired to current product behavior, are environment-wide rather than per organization, and provide no reliable beta kill switch |
| Documentation | Strong but needs consolidation | Auth, authorization, RLS, uploads, audit, collaboration, privacy, exports, and AI trust are documented | Some older readiness statements are stale; architecture/operations need one owned release handbook and review cadence |
| Accessibility | Conditional | Semantic forms/tables, labels, focus styling, responsive layouts, loading/error/empty states | No automated axe gate, keyboard-only acceptance run, screen-reader review, zoom/reflow audit, or documented WCAG target |
| Performance | Unknown/conditional | Server Components, indexes, bounded lists, dynamic private pages, optimized production build | No RUM/APM, Core Web Vitals baseline, load test, query timing, performance budget, or large-tenant export test |
| Security | Conditional | CSP nonce, HSTS, no-store, private buckets, signed URLs, upload validation, CSRF checks, audit logs, RLS | Next.js patch blocker; process-local rate limits; no MFA/WAF/secret scanning/central monitoring; platform configuration is unverified |

## Strengths

- Security boundaries are layered: verified server sessions, membership context,
  centralized permissions, organization/project predicates, foreign keys, RLS,
  and private Storage.
- The product already supports credible external-customer fundamentals:
  multi-organization membership, team roles, project assignments, audit history,
  privacy controls, data export, and account/organization deletion.
- AI behavior is constrained and explainable relative to many beta products:
  retrieved evidence is bounded, citations are validated, failures degrade to
  deterministic behavior, and sensitive actions remain human controlled.
- Destructive lifecycle workflows include confirmation, delay, cancellation,
  legal-hold blocking, retry recovery, and append-only evidence.
- The clean-schema gate tests migrations, RLS/policy structure, unit behavior,
  and authenticated browser flows together.
- Customer-facing privacy statements are separated from visibly marked legal
  placeholders rather than presenting unreviewed prose as binding policy.

## Remaining risks and recommended pre-public-beta improvements

### P0 — release blockers

- Apply the Next.js security patch and enforce connected dependency, secret, and
  SAST scans in CI.
- Add centralized structured logging/error reporting with environment, release,
  correlation ID, safe tenant hash, severity, and redaction tests.
- Configure job schedules, dashboards, queue-age/failure alerts, and a tested
  operator recovery path.
- Complete backup restore, deletion, export, incident response, and key rotation
  exercises.
- Finalize legal and provider documentation; validate that AI training,
  retention, residency, and deletion settings support every Trust Center claim.

### P1 — required before open public beta

- Add distributed per-IP, principal, and organization rate limits for AI,
  invitations, uploads, exports, authentication-adjacent routes, and expensive
  mutations.
- Add MFA and recent-auth/step-up checks for Owners performing member,
  organization, export, and deletion operations.
- Wire real per-organization feature flags with server-side enforcement, audit
  changes, safe defaults, and an emergency kill switch for AI and background
  workflows.
- Add automated accessibility testing plus a manual WCAG 2.2 AA keyboard,
  screen-reader, 200% zoom, contrast, and mobile reflow review.
- Add readiness/dependency health, synthetic login/brief checks, Core Web Vitals,
  server latency/error metrics, database saturation, Storage failures, and queue
  depth/age dashboards.
- Add load tests for the homepage, risk detail, activity, team settings, signed
  downloads, and exports using representative beta tenant sizes.

## High-priority technical debt

1. **In-memory export generation.** Stream datasets/artifacts, enforce record and
   byte budgets before generation, and multipart-upload large packages.
2. **Process-local rate limits.** Move to an edge/Redis/database-backed limiter.
3. **Non-operational feature flags.** Replace legacy V2 environment parsing with
   auditable organization-scoped flags used at server enforcement points.
4. **Broad service-role use.** Continue moving reads/writes toward RLS-bound
   server clients or narrowly scoped security-definer RPCs.
5. **Manual database types.** Generate and verify Supabase types in CI to avoid
   schema drift.
6. **Multi-write workflows.** Convert remaining multi-table activation,
   membership, and lifecycle mutations to transactional RPCs where partial
   completion would be harmful.
7. **Job operations.** Add leases, retry metadata, dead-letter state, queue
   dashboards, and operator-safe replay.
8. **E2E fixture lifecycle.** Make authenticated setup idempotent so focused
   reruns do not require a complete database reset.
9. **Error observability.** Ensure every error boundary and worker emits the
   same searchable reference and a redacted structured event.
10. **Documentation ownership.** Retire stale readiness reports and assign an
    owner/review date to security, AI trust, privacy, and runbook documents.

## First-five-customer onboarding

Use a staged, high-touch cohort. Do not onboard all five simultaneously.

### Before customer 1

- Close every P0 blocker and create a production-like staging tenant.
- Agree in writing on beta scope, prohibited data, support hours, incident
  contacts, AI limitations, retention, export, deletion, and feedback use.
- Nominate one Sightline technical owner and one customer champion.
- Prepare a tenant-specific rollback/offboarding plan and verify export/delete
  in staging.

### Per customer

1. **Discovery and data classification:** document workflows, project count,
   user count, sensitive document categories, residency/contract constraints,
   and success measures.
2. **Tenant creation:** create the organization with a named Owner, confirm
   timezone/currency/retention, and record the approved initial feature set.
3. **Least-privilege team setup:** add one Administrator, then Managers and
   Contributors only for assigned projects. Review access together.
4. **Small data start:** begin with one non-critical active project and a
   controlled document set. Do not bulk-import the portfolio on day one.
5. **Trust walkthrough:** show AI grounding/limitations, document ownership,
   audit log, Trust Center, exports, account deletion, and support references.
6. **Acceptance checks:** login/reset, invitation, project access, upload and
   signed download, risk/action collaboration, export request/download, and
   notification flow.
7. **Hypercare:** daily check-ins for week one, twice weekly for weeks two and
   three, then weekly. Review errors, job failures, access changes, AI feedback,
   and product outcomes.
8. **Exit/offboarding test:** before expanding scope, verify a usable export and
   rehearse the documented deletion/cancellation process without executing a
   production deletion.

### Cohort sequencing

- Customer 1: one project, 3–5 users, two-week observation.
- Customer 2: start only after Customer 1 has five stable business days.
- Customer 3: introduce a second organization profile/industry pattern.
- Customer 4: test the upper expected pilot document and collaboration volume.
- Customer 5: validate repeatability with reduced white-glove intervention.

Pause new onboarding after any cross-tenant concern, Sev 1/2 incident,
unexplained job backlog, data-loss symptom, or material Trust Center mismatch.

## Operational support runbook

### Intake

Collect: customer organization, reporter, timestamp/timezone, page/action,
support reference or correlation ID, expected/actual behavior, impact, affected
users/projects, and screenshot if safe. Never ask for passwords, session cookies,
API keys, full document contents, or signed URLs.

### Severity

- **Sev 1:** suspected cross-tenant exposure, credential compromise, destructive
  data loss, unauthorized export/download, or complete outage.
- **Sev 2:** organization-wide login failure, stuck deletion/export, material AI
  integrity issue affecting decisions, or major workflow unavailable.
- **Sev 3:** single-user/workflow issue with workaround.
- **Sev 4:** question, copy issue, or feature request.

### Triage workflow

1. Open a case and assign an incident owner; acknowledge Sev 1 immediately and
   Sev 2 within the agreed beta SLA.
2. Confirm identity and organization without changing membership or data.
3. Search by support reference/correlation ID, then tenant and time window.
4. Check release version, health, Supabase status, error rate, queue depth/age,
   recent audit events, and affected feature flag state.
5. Reproduce in staging with synthetic data. Do not inspect customer documents
   unless the approved support process and customer authorization permit it.
6. Contain: disable the affected feature, pause a worker, revoke a signed
   artifact, remove a compromised session, or stop onboarding as appropriate.
7. Escalate Sev 1 security/privacy events to the incident and legal/privacy
   contacts. Preserve audit evidence and do not run destructive cleanup.
8. Communicate status on a fixed cadence, record every operator action, validate
   recovery with the customer, and complete a blameless follow-up.

### Common cases

- **Login/reset:** verify provider delivery and redirect configuration; never
  manually set a password. Revoke sessions if compromise is suspected.
- **Access issue:** inspect membership, role, active organization, and project
  membership. Do not bypass RLS or “temporarily” broaden a role.
- **Document issue:** verify metadata ownership and Storage object existence;
  regenerate access only through the authorized route.
- **Export stuck:** inspect job status, attempt count, processing age, Storage
  error, and worker logs. Replay only through the approved worker claim path.
- **Deletion request:** verify requester/Owner authority, countdown, legal hold,
  and audit event. Cancellation is allowed only while scheduled.
- **AI concern:** preserve question, answer, evidence IDs, model/prompt version,
  and feedback; disable the AI feature if grounding or tenant scope is in doubt.

## Production launch checklist

### Build and supply chain

- [ ] Next.js is 16.2.11 or a later approved Active LTS patch.
- [ ] `npm ci`, lockfile audit, secret scan, SAST, lint, types, unit, pgTAP,
      Playwright, and production build pass in CI.
- [ ] Artifact is immutable, tagged with commit/release, and promoted rather
      than rebuilt per environment.

### Identity and access

- [ ] Email verification, SMTP, reset URLs, redirect allowlists, and provider
      abuse limits verified.
- [ ] MFA/step-up decision documented with compensating controls for pilot.
- [ ] `INTERNAL_ADMIN_AUTH_USER_IDS` contains only approved platform operators;
      access is tested and audited.
- [ ] Initial customer Owner/Admin assignments reviewed.

### Data and platform

- [ ] All migrations applied to staging from zero and against a production clone.
- [ ] pgTAP tenant, role, privacy, collaboration, and export tests pass.
- [ ] Database and Storage backup/restore drill completed.
- [ ] Buckets are private; direct client policies remain absent.
- [ ] RLS and service-role secrets verified in the target project.

### Operations

- [ ] Detection, briefs, privacy cleanup, and export schedules configured.
- [ ] Failed/stale/exhausted job and queue-age alerts tested.
- [ ] Central logs, errors, metrics, traces, dashboards, and synthetic checks live.
- [ ] On-call, security, privacy, and customer communication contacts staffed.
- [ ] Incident, export, deletion, restore, and key-rotation runbooks rehearsed.

### Customer trust

- [ ] Privacy Policy, Terms, Security Documentation, Subprocessor List, and
      Accessibility Statement approved and published.
- [ ] `privacy@sightline.app` is monitored with a documented response SLA.
- [ ] AI provider DPA, training opt-out, retention, deletion, and residency
      settings verified.
- [ ] Trust Center statements match contracts and deployed behavior.
- [ ] Beta agreement, data restrictions, support SLA, and feedback consent signed.

### Product quality

- [ ] Keyboard, screen-reader, contrast, zoom, and responsive review passed.
- [ ] Representative load/performance tests meet agreed budgets.
- [ ] Export integrity and deletion cancellation tested in staging.
- [ ] Customer onboarding and offboarding dry runs completed.

## Intentionally defer until V4

- Billing, subscription enforcement, invoices, and plan entitlements.
- Enterprise SSO/SAML, SCIM provisioning, and directory sync.
- Customer-defined/custom roles beyond the documented role matrices.
- Public API keys, external developer platform, and broad webhook ecosystem.
- Email/push delivery for the notification foundation.
- Full legal-hold case management, custodians, approvals, and discovery exports.
- Multi-region data residency and customer-managed encryption keys.
- Tamper-evident external audit archives and compliance certification programs.
- Automated support impersonation; if ever introduced, require explicit customer
  consent, step-up authentication, time limits, banners, and complete auditing.
- Advanced portfolio intelligence, benchmarking, and cross-project learning
  beyond the agreed design-partner experiments.

These deferrals must not postpone the P0/P1 security, monitoring, accessibility,
legal, and operational controls required for a safe beta.

## Changes made during this review

- Separated platform-operator access from organization Owner authority. Internal
  tools now fail closed unless the authenticated user is in the server-only UUID
  allowlist.
- Added tests for the platform-operator allowlist and malformed configuration.
- Added customer-visible root error support references.
- Corrected README cron-secret length, scheduler, internal-admin, environment,
  and E2E instructions.
- Clarified in the Trust Center that audit retention is a recorded policy and
  automated audit purge remains pending legal approval.

## Validation record

Final results after all review changes:

- ESLint: pass with zero warnings
- TypeScript: pass
- Vitest: 39 files, 187 tests passed
- PostgreSQL/pgTAP: 6 files, 61 tests passed
- Playwright: 24 tests passed
- Production webpack build: pass on Next.js 16.2.10
- Clean migration reset/seed: pass through all migrations
- `git diff --check`: pass
- Connected npm advisory scan: blocked in this environment by registry DNS

## External security references

- Next.js July 2026 Security Release:
  <https://nextjs.org/blog/july-2026-security-release>
- React Server Components security update:
  <https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components>
