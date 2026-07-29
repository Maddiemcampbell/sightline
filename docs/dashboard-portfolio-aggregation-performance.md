# Dashboard portfolio aggregation performance

## Scope

The dashboard portfolio summary, project health rows, risk-driver grouping, and
compact heatmap are calculated by
`public.get_dashboard_portfolio_aggregates`. The function is organization
scoped, uses the caller's project-access rules, and groups the accessible risk
set once. The React server path no longer rebuilds those values by filtering
the entire risk collection once for each project.

Project-specific risk analytics now partition risks, actions, and evidence in
one pass before running the existing deterministic calculations on each
project's bounded subset. This replaces the previous `projects × all risks`
scan while preserving the existing calculation and taxonomy versions.

## Measurements

The Playwright test `tests/e2e/dashboard-load.spec.ts` issues 20 concurrent
authenticated requests with a 30-second request timeout. Every run attaches
`dashboard-load-measurements.json` to the Playwright result. The attachment
records minimum, median, p95, maximum, total wall-clock duration, and each HTTP
status. This keeps response-time evidence tied to the environment and commit
that produced it rather than publishing misleading laptop-only figures.

Run the measurement after resetting the local database:

```sh
npm run test:e2e -- tests/e2e/dashboard-load.spec.ts
```

Inspect the aggregate query itself with:

```sql
explain (analyze, buffers, format text)
select public.get_dashboard_portfolio_aggregates(
  '<organization-id>'::uuid,
  now()
);
```

Record database duration from `Execution Time` and page-response measurements
from the Playwright attachment in the release evidence. A failed response,
request exceeding 30 seconds, or non-200 response fails the concurrency test.

## Query and payload characteristics

- PostgreSQL returns compact JSON aggregate rows rather than one response row
  per risk for these dashboard sections.
- Project risk counts and exposure are grouped once by `project_id`.
- Risk drivers are grouped once by category and limited to five.
- The compact heatmap is limited to six accessible active projects, matching
  the existing UI.
- Top project issues use a bounded lateral lookup and the existing executive
  attention factors.
- Organization and project authorization are enforced inside the
  security-invoker function and by RLS.

Rich risk details, work queues, evidence-backed intelligence, and cash-flow
forecast inputs remain separate because those components consume record-level
data. Future optimization should expose purpose-built aggregate functions for
those independently, rather than expanding this function into a monolithic
dashboard payload.
