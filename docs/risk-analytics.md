# Portfolio risk analytics

Sightline uses one deterministic `risk-analytics/1.0` calculator for dashboard,
Reports, and organization-wide Ask Sightline context. Records are restricted by
RLS and project membership before aggregation.

The original risk category is never rewritten. `portfolio-taxonomy/1.0` maps
structured categories to normalized portfolio categories and records source,
confidence, and version; a valid manual override wins. Unmapped values remain
`other`, never guessed.

The heatmap’s primary intensity is the highest active severity in a project ×
category cell. The displayed number is active risk count. Every cell provides a
text explanation, contributing risk IDs, and a stable filtered drill-down URL.
Color is supplementary.

`executive-attention/1.0` starts with severity ordinal points (25/50/75/100),
then adds 12 for overdue mitigation, 8 for no owner, 7 for no mitigation, and 5
for no evidence. This is a prioritization score—not probability or predicted
loss—and reasons are returned with every ranked risk.

Financial exposure aggregates only when `financial_exposure_assessed=true`.
Unassessed exposure is `null`, not `$0`. Expected exposure is unavailable
because the current risk model has no authoritative probability. No schedule,
safety, compliance, or operational dollar estimate is fabricated.

Accurate historical state cannot be reconstructed from current rows and sparse
activity events. `portfolio_risk_snapshots` therefore stores monthly,
versioned aggregate outputs. Only service jobs write snapshots; reads are
limited to organization Owners because snapshots can contain portfolio-wide
financial and project totals. Snapshot jobs must upsert on
`(organization_id,snapshot_month)` and are therefore idempotent.
