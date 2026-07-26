# Financial analytics

Sightline financial outputs are calculated by the shared financial analytics
domain and consumed by the dashboard, Reports, and Ask Sightline.

## Budget convention

Current approved budget is original budget plus approved change orders. Pending
change orders are reported separately and do not change the approved budget.
Revised budget currently means the same approved budget; this avoids treating
unapproved scope as available funding.

Estimate at completion is actual cost plus forecast cost to complete.

Budget variance is:

`current approved budget - estimate at completion`

A positive variance is under budget. A negative variance is over budget. Zero is
on budget. Portfolio variance is calculated from summed money values, never by
averaging project percentages.

## Missing data and provenance

Null inputs remain unknown and never become zero. Outputs declare one of:
complete, partial, estimated, missing, or unavailable. Every money metric
contains its source fields, calculation timestamp and version, whether it is
derived, and missing inputs.

Integer cents and BigInt intermediate arithmetic protect authoritative amounts
from floating-point drift. Portfolio totals are unavailable when currencies
differ; foreign exchange is intentionally unsupported.

## Cash flow

Scheduled payment, invoice, and commitment events take precedence. High
confidence means scheduled payments or invoices, medium means commitments, and
low means forecasts or estimated distributions.

When a project has no scheduled outflows, its forecast cost to complete is
distributed across forecast buckets through its completion date. This is
explicitly estimated, low confidence, and does not create or overwrite
accounting records. Missing schedules do not generate estimated inflows.

## Monthly snapshots

The portfolio-intelligence job creates one compact aggregate snapshot per
organization and UTC month. A unique organization/month constraint and
duplicate-safe service make creation idempotent. The snapshot stores aggregate
metrics plus only the project identifier, name, variance, and quality needed for
historical comparisons.

Snapshots are derived decision-support records, not a general ledger or
accounting reconciliation.
