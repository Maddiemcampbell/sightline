# Sightline

Sightline is a profit intelligence platform for commercial construction
companies. Its initial promise is to tell an executive, every morning, the
three things most likely to cost them money that week.

This repository contains only the technical foundation. It does not include
predictive models, advanced AI, third-party construction integrations, or
autonomous workflows.

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

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). The health endpoint is
   available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

Environment variables are parsed with Zod when the Supabase client is created.
The placeholder routes and production build do not require live credentials.

## Scripts

| Script                 | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start the local Next.js development server          |
| `npm run build`        | Create a production build                           |
| `npm run start`        | Serve a production build                            |
| `npm run lint`         | Run ESLint with zero warnings allowed               |
| `npm run lint:fix`     | Apply safe ESLint fixes                             |
| `npm run typecheck`    | Run strict TypeScript checks without emitting files |
| `npm run format`       | Format supported files with Prettier                |
| `npm run format:check` | Check formatting without changing files             |
| `npm run test`         | Run Vitest unit tests once                          |
| `npm run test:watch`   | Run Vitest in watch mode                            |
| `npm run test:e2e`     | Run Playwright end-to-end tests                     |
| `npm run check`        | Run formatting, lint, types, and unit tests         |
| `npm run db:start`     | Start the local Supabase stack                      |
| `npm run db:stop`      | Stop the local Supabase stack                       |
| `npm run db:reset`     | Reapply migrations and deterministic seed data      |
| `npm run db:status`    | Show local Supabase endpoints and status            |
| `npm run db:types`     | Regenerate types from the local PostgreSQL schema   |

Before the first E2E run, install Playwright's Chromium binary with
`npx playwright install chromium`. The E2E command creates and serves a
production build so the suite behaves consistently locally and in CI.

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

The initial routes are:

- `/`
- `/brief`
- `/projects`
- `/projects/[projectId]`
- `/risks`
- `/risks/[riskId]`
- `/documents`
- `/settings`
- `/api/health`

## Data and forms

Supabase access starts at `src/lib/supabase`. Browser-safe access and the
server-only administrative client are separate. Never expose service-role keys
to the browser. Zod is the validation boundary for untrusted data; React Hook
Form and `@hookform/resolvers` are available when interactive forms are
introduced.

The V1 schema, selection rules, index strategy, and assumptions are documented
in [`docs/data-model.md`](docs/data-model.md). Migration files and deterministic
development data live under `supabase/`.

## Deployment

The application can deploy to any host that supports Next.js 16 and Node.js 22.
For Vercel, import the repository, set the two variables from `.env.example`,
and deploy. For another Node host, run `npm ci`, `npm run build`, and
`npm run start`. Run `npm run check` and `npm run test:e2e` in CI before the
deployment step.

Supabase database migrations and production environment values should be
managed outside the application build and promoted separately for each
environment.
