# Customer data export

Sightline exports are organization-scoped, asynchronous jobs available only to
organization Owners and Administrators. Authentication and centralized
authorization are repeated at request time and again immediately before every
download. Knowing an export UUID is insufficient to access an artifact.

## Contents and formats

Exports include projects, risks, actions, document metadata, vendors, risk
activity, comments, AI conversations and messages, Daily Briefs, and brief
items. JSON exports contain a manifest and data in one JSON document. CSV
exports are ZIP containers with one spreadsheet-safe CSV per dataset plus
`manifest.json`. ZIP exports contain the manifest, all CSV files, and
`data.json`.

The manifest records schema version, organization and export identifiers,
generation and expiration timestamps, dataset record counts, included files,
and explicit exclusions. Authentication credentials, sessions, API keys,
integration credentials, storage paths, AI provider/model/prompt/token
telemetry, and internal audit/system metadata are never exported. Document
binary contents are not included; only customer-facing document metadata is
exported.

## Processing and retention

`GET /api/cron/data-exports` requires the shared cron bearer secret. It claims
queued work using `FOR UPDATE SKIP LOCKED`, retries stale jobs, and writes
artifacts to the private `organization-exports` bucket. Deployments should run
the worker at least every five minutes.

Owners and Administrators can configure one recurring schedule per organization
with an enabled state, CSV/JSON/ZIP format, daily/weekly/monthly cadence, local
time, calendar day, and IANA timezone. The central scheduler creates at most one
export per local schedule occurrence using a database uniqueness constraint.

Artifacts expire seven days after generation. Each worker run removes expired
objects before claiming new work and marks their history records `expired`.
History remains available without the storage path. Generation failures use
bounded exponential backoff and a five-attempt limit. Retry timestamps and
attempt counts are visible in durable export history; terminal failures notify
the requesting member. Artifact paths are deterministic, uploads use upsert,
and stale claims are not eligible for one hour.

## Download security and auditing

The browser receives no bucket path. The download route validates the current
server-side session, active organization, role, organization ownership, job
status, and expiration before creating a five-minute signed URL. Invalid,
expired, unauthorized, and cross-tenant identifiers all return the same 404
response to resist enumeration. The bucket has no authenticated storage
policies and is never public.

Audit events are recorded when a schedule changes and when an export is
requested, scheduled, retried, completed, fails terminally, and is downloaded.
The requester receives an in-app notification when processing completes or
exhausts its retries.
