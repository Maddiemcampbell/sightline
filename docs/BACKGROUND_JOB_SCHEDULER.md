# Background Job Scheduler

Sightline’s scheduler is a small application service backed by PostgreSQL. An
external production cron invokes `GET /api/cron/scheduler` once per minute with
`Authorization: Bearer $CRON_SECRET`; the application does not depend on a
process-local timer.

The centralized registry is in `src/features/scheduler/jobs.ts`. Registration
validates unique keys, five-field UTC cron expressions, handlers, timeouts, and
bounded retry settings when the Node.js runtime starts. Matching definitions
are persisted for operator visibility and enabled/disabled control.

Every attempt receives its own execution row and correlation ID. PostgreSQL
leases prevent the same job from overlapping across application instances.
Leases expire after the configured timeout plus a safety window, allowing a
new instance to recover after a crash. Release requires the acquiring token.

Retryable failures receive a persisted exponential-backoff timestamp. A later
scheduler invocation creates a linked child attempt. Validation and other
explicitly non-retryable errors use `NonRetryableSchedulerError`. Retries are
never performed in an unbounded application loop.

Existing job-specific cron routes remain available for compatibility. They use
the same execution, timeout, lease, retry, and history path. Platform operators
with `platform.jobs.read` can trigger a registered job from the existing
internal jobs page; manual attempts are recorded with the operator ID and in
the platform audit ledger.

Execution records contain only bounded error summaries and sanitized metadata.
Handlers and scheduler logs must never include secrets, document contents, or
raw customer data.
