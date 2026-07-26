# Scheduled Portfolio Intelligence and Daily Executive Briefs

Sightline stores organization-local schedule configuration in
`organization_job_schedules` and durable execution history in
`organization_job_runs`. The application remains scheduler-agnostic: production
infrastructure should invoke the two cron routes at least every 15 minutes:

- `GET /api/cron/portfolio-intelligence`
- `GET /api/cron/send-briefs`

Both requests require `Authorization: Bearer <CRON_SECRET>`. Invoking a route
more than once is safe. A unique organization, job type, and local-date
idempotency key prevents duplicate successful daily work.

## Execution behavior

- Each organization is processed with an explicit organization ID.
- Portfolio refresh recalculates deterministic observations and risk
  relationships, then records financial and risk snapshots.
- Daily Brief execution regenerates that organization's brief before delivery.
- Delivery uses the existing recipient preferences and append-only delivery
  records. Scheduled organization delivery time is authoritative for automated
  runs; users with email delivery disabled are excluded.
- Failed runs retry after an increasing delay, up to the configured attempt
  limit. Cron invocations pick up due retries.
- Owners and Administrators receive an in-app failure notification after each
  failed attempt, including whether another retry is scheduled.
- Duration and output counts are stored with the run and displayed at
  `/settings/automation`.

## Production assumptions

The cron platform must use a timeout long enough for the expected beta portfolio
size and alert when a cron route itself cannot be reached. Sightline records
application-level failures, but cannot report an outage when no request reaches
the application. As portfolios grow, move execution behind a durable queue with
bounded concurrency while preserving `organization_job_runs` as the control
plane.
