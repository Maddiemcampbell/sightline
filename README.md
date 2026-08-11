# Sightline

Sightline is a profit intelligence platform for commercial construction
companies. Its initial promise is to tell an executive, every morning, the
three things most likely to cost them money that week.

The current product includes evidence-backed risk and action workflows,
deterministic forecasting, executive reports and editable slide decks, meeting
preparation, configurable exception alerts, human-controlled email drafting,
commitment follow-up automation, and integration foundations for Procore and
Microsoft 365. AI-generated content remains reviewable and separate from
authoritative record mutation.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A Supabase project for database-backed development

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the sample environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Replace the sample values with the URL and publishable key from your
   Supabase project settings.

   Set `CRON_SECRET` to a random value of at least 32 characters before enabling
   scheduled detection. In production, call `GET /api/cron/scheduler` once per
   minute with
   `Authorization: Bearer $CRON_SECRET`. The centralized scheduler runs all due
   jobs and persisted retries. Existing job-specific cron URLs remain supported
   as compatibility entry points. See `docs/BACKGROUND_JOB_SCHEDULER.md`.
   Development also exposes the internal-only `/internal/detection` manual-run
   page.

   Morning email uses Resend through its HTTPS API. Configure `RESEND_API_KEY`,
   a verified `EMAIL_FROM` sender, and the public `APP_URL`. Sightline evaluates
   each recipient's preferred local delivery time.
   Development exposes `/internal/email-preview` for HTML and plain-text review.

   Configure `INTERNAL_ADMIN_AUTH_USER_IDS` with a comma-separated
   list of Supabase Auth UUIDs for Sightline platform operators. Organization
   Owner status alone does not grant access to `/internal` tools.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). The health endpoint is
   available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

Environment variables are parsed with Zod when the Supabase client is created.
The placeholder routes and production build do not require live credentials.

## Scripts

| Script                            | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| `npm run dev`                     | Start the local Next.js development server            |
| `npm run build`                   | Create a production build                             |
| `npm run start`                   | Serve a production build                              |
| `npm run lint`                    | Run ESLint with zero warnings allowed                 |
| `npm run lint:fix`                | Apply safe ESLint fixes                               |
| `npm run typecheck`               | Run strict TypeScript checks without emitting files   |
| `npm run format`                  | Format supported files with Prettier                  |
| `npm run format:check`            | Check formatting without changing files               |
| `npm run test`                    | Run Vitest unit tests once                            |
| `npm run test:watch`              | Run Vitest in watch mode                              |
| `npm run test:e2e`                | Reset data, run pgTAP, then run Playwright tests      |
| `npm run test:e2e:no-reset`       | Run Playwright without resetting local data           |
| `npm run dev:bootstrap-users`     | Repair local Owner and Contributor test identities    |
| `npm run validate:production-env` | Validate production variables without printing values |
| `npm run check`                   | Run formatting, lint, types, and unit tests           |
| `npm run db:start`                | Start the local Supabase stack                        |
| `npm run db:stop`                 | Stop the local Supabase stack                         |
| `npm run db:reset`                | Reapply migrations and deterministic seed data        |
| `npm run db:status`               | Show local Supabase endpoints and status              |
| `npm run db:types`                | Regenerate types from the local PostgreSQL schema     |

Before the first E2E run, install Playwright's Chromium binary with
`npx playwright install chromium`. The default E2E command intentionally resets
the local Supabase development database so stateful mutation tests always start
from deterministic seed data. It creates a production build and serves it on
port `3100`, separate from the normal development server on port `3000`.

After a database reset, `npm run dev:bootstrap-users` creates or repairs the
verified local Owner and Contributor Auth identities, links their organization
memberships, and assigns the Contributor to the demo projects. The command
refuses to run against a non-local Supabase URL. Both accounts use the password
printed by the command.

## Architecture

```text
src/
├── app/                # App Router pages, layouts, and route handlers
├── components/         # Shared application and shadcn-style UI components
│   └── ui/             # Reusable UI primitives
├── domain/             # Framework-independent domain configuration and logic
└── lib/                # Environment, Supabase, and shared utilities
tests/
└── e2e/                # Playwright browser tests
```

Pages are Server Components by default. Client Components should be introduced
only where browser interactivity is necessary. Domain rules belong in
`src/domain`, data-access boundaries in `src/lib`, and presentation in
`src/components` or the relevant route.

Key customer routes include:

- `/`
- `/brief`
- `/ask`
- `/projects`
- `/projects/[projectId]`
- `/risks`
- `/risks/[riskId]`
- `/actions`
- `/meetings`
- `/documents`
- `/reports`
- `/forecasts`
- `/forecasts/readiness`
- `/integrations`
- `/organization`
- `/settings`
- `/help/documentation`
- `/api/health`

## User guides

The authenticated Help menu links to the in-app guide at
`/help/documentation`. It covers the daily workflow, workspace navigation,
responsible use of Ask Sightline, and role-aware access. Focused guides are
available for:

- `/help/forecasting` — baseline forecasts, scenarios, and data readiness
- `/help/reports-meetings` — PDFs, executive decks, agendas, decisions, and follow-up actions
- `/help/follow-ups-alerts` — requested commitments, reminders, evidence verification, escalation, and exception thresholds

Keep user-facing workflow guidance in `src/features/help/content.ts` and
`src/features/help/product-guide.tsx` so it ships with the product and remains
available from the Help menu.

## Data and forms

Supabase access starts at `src/lib/supabase`. Browser-safe access and the
server-only administrative client are separate. Never expose service-role keys
to the browser. Zod is the validation boundary for untrusted data; React Hook
Form and `@hookform/resolvers` are available when interactive forms are
introduced.

The V1 schema, selection rules, index strategy, and assumptions are documented
in [`docs/data-model.md`](docs/data-model.md). Migration files and deterministic
development data live under `supabase/`.

Controlled AI analysis is optional. Set `OPENAI_API_KEY` and optionally
`OPENAI_MODEL` to use the initial provider. Without a key, development fixtures
fall back to deterministic V1 suggestions. No suggestion becomes a risk without
human review. See [`docs/ai-trust-model.md`](docs/ai-trust-model.md).

The V2 application-service boundaries, authorization model, mutation flow,
feature flags, and testing strategy are documented in
[`docs/v2-architecture.md`](docs/v2-architecture.md).

## Deployment

Production secrets belong in the deployment provider, not in `.env` files or
Git. The hosted Supabase Auth project also requires its own Site URL, redirect
allowlist, email-confirmation, and SMTP configuration. Follow
[`docs/production-configuration.md`](docs/production-configuration.md) and run
`npm run validate:production-env` in the production deployment environment.

The application can deploy to any host that supports Next.js 16 and Node.js 22.
For Vercel, import the repository, configure every applicable value from
`.env.example` in the platform secret store, and deploy. For another Node host,
run `npm ci`, `npm run build`, and
`npm run start`. Run `npm run check` and `npm run test:e2e` in CI before the
deployment step.

Supabase database migrations and production environment values should be
managed outside the application build and promoted separately for each
environment.

# Stripe test mode

Set `BILLING_PROVIDER=stripe`, `STRIPE_MODE=test`, an `sk_test_` secret key,
the webhook signing secret, and test-mode Price IDs for both launch plans.
Stripe responses and webhook events are rejected if their mode does not match
`STRIPE_MODE`; production environment validation requires `STRIPE_MODE=live`
and an `sk_live_` key.

For local webhook testing, run `stripe listen --forward-to
localhost:3000/api/stripe/webhook` and copy the emitted `whsec_` value into
`STRIPE_WEBHOOK_SECRET`. Keep the request body unmodified because webhook
signature verification uses Stripe's raw payload.

Local test accounts are provisioned automatically after a database reset:

- Owner: `e2e-owner@sightline.local`
- Contributor: `alex-rivera@sightline.local`
- Password: `Sightline-E2E-2026!`
