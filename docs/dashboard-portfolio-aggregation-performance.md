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

Every Intelligence homepage request now emits one privacy-safe
`[dashboard-performance]` structured log. It reports total server-side
duration and separate elapsed durations for each named query and derivation
stage. It deliberately excludes query parameters, returned rows, user-entered
text, and document contents. This makes project, risk, action, evidence,
financial, observation, and intelligence costs independently visible in the
production logging pipeline.

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

### Deterministic derivation benchmark

The unit benchmark compares the former project-analytics implementation—which
passed the complete organization dataset through the analytics calculator once
per project—with the partitioned implementation. Both paths must return
identical project summaries before timing is accepted.

Recorded locally on 2026-07-28 using 200 projects and 2,000 risks:

| Implementation              | Duration |
| --------------------------- | -------: |
| Repeated organization scans |  12.4 ms |
| Single partition pass       |   4.5 ms |
| Improvement                 |    63.5% |

These figures are a derivation microbenchmark, not a production page-load
claim. Re-run
`src/features/dashboard/large-portfolio.test.ts` with Vitest's verbose reporter
when runtime or calculation behavior changes.

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
- Financial analytics reuses the homepage's authorized project result rather
  than issuing a duplicate project query.
- Financial change orders are grouped by project once rather than scanning the
  complete change-order collection once per project.

Rich risk details, work queues, evidence-backed intelligence, and cash-flow
forecast inputs remain separate because those components consume record-level
data. Future optimization should expose purpose-built aggregate functions for
those independently, rather than expanding this function into a monolithic
dashboard payload.

The profiler is expected to identify the remaining bottlenecks as portfolio
sizes grow. The principal known candidates are complete record retrieval for
rich risk analytics and portfolio observations, historical risk matching, and
cash-flow event bucketing. These should be optimized independently only when
measured query or derivation timings justify the additional database contract.
