# Portfolio intelligence

Sightline V3.3 introduces organization-owned, explainable portfolio memory. The
first release is deterministic: it applies documented rules to data the current
organization has authorized Sightline to process. It does not ask a model to
invent patterns or causal links.

## Portfolio observations

`portfolio_observations` is the reusable contract for current and future
intelligence. Each record includes a stable tenant-scoped key, title, summary,
typed supporting evidence, confidence, affected projects, a business-impact
estimate and explanation, a recommended next step, and an algorithm version.

Version `portfolio-deterministic-v1` evaluates:

- document coverage: at least two active projects with no active document;
- vendor concentration: at least three vendor-linked unresolved risks, with the
  leading one or two vendors representing at least 40%;
- recurring risk category: at least three unresolved risks in the same category
  across at least two projects;
- overdue follow-through: at least three overdue actions across at least two
  projects.

Confidence is 100% for these observations because it describes confidence that
the stated arithmetic rule matched—not confidence that the pattern caused a
business outcome. Financial impact is the summed current risk exposure and its
label explicitly states what it does and does not estimate.

The homepage calculates current observations from the request's RLS-scoped data
so it is immediately current. `GET /api/cron/portfolio-intelligence`, protected
by `CRON_SECRET`, materializes the same observations for longitudinal use.
Refreshes supersede stale observations and upsert current observations, making
retries safe.

## Connected risks

`risk_relationships` supports:

- `duplicate`
- `caused_by`
- `contributes_to`
- `blocks`
- `same_vendor`
- `same_subcontractor`
- `same_document`
- `same_project_phase`
- `same_root_cause`

The first deterministic algorithm creates only relationships it can prove from
exact identifiers: matching detection keys, vendor IDs, and cited document IDs.
It never infers `caused_by`, `contributes_to`, or `blocks`. Those types are
reserved for explicit human decisions or a future reviewed workflow. Scheduled
refresh replaces only deterministic edges and preserves human-authored edges.

RLS allows a user to read an edge only when they can access both endpoint
projects. The service role is the only principal allowed to materialize graph
data.

## Historical memory

Active risk pages compare the current risk with resolved, accessible risks in
the same organization. The ranking is explainable:

- same deterministic detection key: 60 points;
- same category: 30 points;
- same vendor: 25 points;
- title-token overlap of at least 25%: up to 25 points.

Matches below 30 points are excluded. Each result shows the previous issue,
project, recorded resolution, elapsed time, feedback-based outcome, exposure
(only when the viewer has financial permission), score, and match reasons.
Reopened resolutions are excluded.

## Root-cause hypotheses and homepage intelligence

The homepage organizes intelligence into Portfolio Watch, Emerging Patterns,
Similar to Last Quarter, and Executive Recommendations. Portfolio Watch ranks
observations by represented exposure and affected-project count. Emerging
signals outside that cutoff appear only when at least one related risk was
detected in the previous 30 days. Historical comparisons are limited to
resolutions recorded during the previous calendar quarter.

Root-cause suggestions are hypotheses, not conclusions. Version
`portfolio-deterministic-v1` requires:

- two independently derived supporting observations;
- overlap across at least two projects;
- at least two evidence items;
- an explicit confidence threshold of 70%;
- documented assumptions and investigation steps.

Current hypothesis rules cover overlapping document-coverage and recurring-risk
signals, vendor-concentration and recurring-risk signals, and overdue-action and
recurring-risk signals. The UI labels every result “Hypothesis — not a
conclusion,” displays its assumptions, and explains that timing correlation is
not a forecast. If these thresholds are not met, Sightline displays no
suggestion. Executive recommendations prioritize investigation of qualified
hypotheses, followed by the next steps attached to the highest-impact
observations.

## Isolation and limitations

All reads begin with authenticated organization context and remain subject to
project RLS. Portfolio observations are limited to Owners and Administrators.
Financial figures use the centralized authorization service.

The current schema does not have a reliable RFI response-time series, project
industry/type, project phase, subcontractor identity, or normalized root cause.
Sightline therefore does not claim trends or relationships based on those
fields. Add normalized source data and deterministic acceptance rules before
introducing those detectors. Future AI may summarize these records, but must
preserve organization isolation, evidence, algorithm/source provenance, and a
human-review boundary for causal edges.

## Operations

Run the materialization endpoint after risk detection and after nightly data
imports. Alert on non-2xx responses and retry; the job is safe to rerun.
Historical observations should be retained according to the organization's data
retention policy. Organization deletion cascades both observations and graph
edges.
