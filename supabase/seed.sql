-- Deterministic development seed for Sightline V1.

insert into public.organizations (id, name, slug, timezone, plan_key)
values ('10000000-0000-4000-8000-000000000001', 'BuildCo Construction', 'buildco-construction', 'America/Los_Angeles', 'professional');

update public.organizations
set industry = 'Commercial construction',
    company_size = '201-500',
    default_currency = 'USD',
    brand_color = '#173f32'
where id = '10000000-0000-4000-8000-000000000001';

insert into public.users (id, organization_id, email, full_name, title, role)
values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'maddiemcampbell@gmail.com',
  'Matt Anderson',
  'Operations Director',
  'executive'
), (
  '11000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'alex.rivera@buildco.example',
  'Alex Rivera',
  'Senior Project Manager',
  'project_manager'
);

insert into public.projects (
  id, organization_id, name, project_number, status, address_line_1, city, state_code,
  postal_code, contract_value_cents, start_date, target_completion_date, image_url
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Cedar Grove Medical Pavilion', 'BC-24017', 'active', '1800 Cedar Grove Way', 'Sacramento', 'CA', '95814', 2850000000, '2026-01-12', '2027-03-26', '/images/projects/cedar-grove-medical-pavilion.png'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Riverfront Distribution Center', 'BC-24022', 'active', '450 Harbor Industrial Road', 'Stockton', 'CA', '95203', 4180000000, '2025-11-03', '2026-12-18', '/images/projects/riverfront-distribution-center.png'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Northgate Civic Center', 'BC-25004', 'active', '900 Northgate Plaza', 'Roseville', 'CA', '95678', 1975000000, '2026-03-02', '2027-01-29', '/images/projects/northgate-civic-center.png'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Sierra Vista High School Modernization', 'BC-25009', 'active', '72 Falcon Drive', 'Folsom', 'CA', '95630', 1260000000, '2026-05-18', '2027-06-11', null),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Juniper Row Apartments', 'BC-25011', 'active', '410 Juniper Street', 'Oakland', 'CA', '94607', 2340000000, '2026-02-09', '2027-08-20', null),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Granite Peak Data Center', 'BC-25014', 'active', '8800 Logic Loop', 'Reno', 'NV', '89521', 5620000000, '2026-04-06', '2027-11-12', null),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Mercer University Residence Hall', 'BC-25016', 'active', '60 College Avenue', 'Davis', 'CA', '95616', 1890000000, '2026-06-01', '2027-07-30', null),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Market Square Mixed-Use Tower', 'BC-25018', 'active', '120 Market Square', 'San Jose', 'CA', '95113', 6850000000, '2025-09-15', '2028-02-18', null),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'Harbor Point Office Renewal', 'BC-24008', 'complete', '22 Embarcadero', 'San Francisco', 'CA', '94111', 980000000, '2025-01-13', '2026-06-26', null),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Clearwater Pump Station', 'BC-25020', 'planning', '300 River Service Road', 'Modesto', 'CA', '95354', 1480000000, '2026-09-08', '2027-12-17', null);

update public.projects
set archived_at = '2026-07-01T00:00:00Z'
where id in (
  '20000000-0000-4000-8000-000000000009',
  '20000000-0000-4000-8000-000000000010'
);

insert into public.vendors (id, organization_id, name, trade, contact_name, contact_email)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Apex Electrical Systems', 'Electrical', 'Rosa Martinez', 'rosa@apex-electrical.example'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Summit Concrete Group', 'Concrete', 'Daniel Cho', 'daniel@summit-concrete.example'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Pacific Mechanical Partners', 'Mechanical', 'Erin Walsh', 'erin@pacific-mechanical.example'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Iron Ridge Steel', 'Structural steel', 'Marcus Green', 'marcus@iron-ridge.example'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Golden State Interiors', 'Drywall and finishes', 'Nina Patel', 'nina@golden-state-interiors.example');

insert into public.project_vendors (organization_id, project_id, vendor_id, scope_of_work)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Electrical distribution and low voltage'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'Foundations and structural concrete'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Slabs and tilt-up panels'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Structural steel'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Mechanical systems'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'Interior framing and drywall'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'Electrical modernization');

insert into public.integration_sources (id, organization_id, provider, name, is_active, last_synced_at)
values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'manual', 'V1 sample documents', true, '2026-07-18T13:00:00Z');

insert into public.documents (
  id, organization_id, project_id, vendor_id, integration_source_id, name,
  document_type, document_date
)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Apex Electrical certificate of insurance', 'insurance', '2025-07-25'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Riverfront two-week lookahead', 'schedule', '2026-07-17'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, '40000000-0000-4000-8000-000000000001', 'Northgate daily log compilation - week 29', 'daily_log', '2026-07-17');

insert into public.risks (
  id, organization_id, project_id, vendor_id, title, summary, category, severity,
  status, potential_exposure_cents, estimated_margin_impact_cents, confidence_score,
  why_it_matters, detected_at, due_at
)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Apex Electrical insurance expires in seven days', 'The subcontractor certificate of insurance expires while energized electrical work remains scheduled.', 'insurance', 'critical', 'action_needed', 32500000, 12500000, 96, 'An uninsured subcontractor on an active site can stop work, create contractual default, and transfer otherwise insured loss exposure to BuildCo.', '2026-07-18T12:00:00Z', '2026-07-25T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Forecast rain threatens Friday concrete placement', 'A high-probability storm overlaps the 1,100-yard slab placement and the current plan has no protected pour sequence.', 'weather', 'high', 'action_needed', 18600000, 8400000, 91, 'A missed placement will idle the finishing crew, consume reserved pump time, and push steel erection into the following week.', '2026-07-18T12:15:00Z', '2026-07-20T16:00:00Z'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', null, 'Daily logs indicate a possible owner-directed scope dispute', 'Three consecutive daily logs describe owner field direction for added lobby backing without an executed change directive.', 'contract', 'high', 'action_needed', 14500000, 7200000, 88, 'Continuing undocumented extra work weakens entitlement and could leave BuildCo carrying labor and material cost.', '2026-07-18T12:30:00Z', '2026-07-21T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'Switchgear submittal remains unapproved', 'The main switchgear submittal has been in review for 24 days against a 14-day contractual review period.', 'schedule', 'medium', 'monitoring', 9200000, 3600000, 79, 'Late approval may consume procurement float and threaten the planned winter shutdown.', '2026-07-16T16:00:00Z', '2026-07-24T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'Mechanical coordination drawings have unresolved clashes', 'Nine ceiling-space clashes remain open ahead of corridor framing release.', 'documentation', 'medium', 'in_progress', 7800000, 2900000, 82, 'Framing before coordination closes could create rework across multiple trades.', '2026-07-15T15:00:00Z', '2026-07-23T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Steel crew overtime is exceeding the recovery plan', 'Reported overtime is 18 percent above the approved recovery assumption for the second week.', 'financial', 'medium', 'monitoring', 6100000, 2600000, 76, 'Sustained overtime without production gains will erode the recovery budget before the structure is topped out.', '2026-07-17T13:00:00Z', '2026-07-22T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 'Drywall manpower is below the committed plan', 'The subcontractor averaged 21 workers against a committed crew of 30 over the last four shifts.', 'vendor', 'low', 'monitoring', 4200000, 1500000, 73, 'If the crew does not recover this week, above-ceiling inspections and finishes will begin losing float.', '2026-07-17T14:00:00Z', '2026-07-25T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', null, 'Open excavation lacks documented daily inspection', 'The last two excavation shifts do not include a competent-person inspection record.', 'safety', 'high', 'monitoring', 5000000, 1000000, 90, 'Missing inspection records expose the project to preventable safety and compliance risk.', '2026-07-14T14:00:00Z', '2026-07-15T15:00:00Z'),
  ('60000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Window mockup requires corrective testing', 'Air and water testing found one perimeter seal outside the approved assembly.', 'other', 'high', 'in_progress', 12800000, 4200000, 92, 'Unresolved envelope quality can multiply rework across repeated apartment units.', '2026-07-23T16:00:00Z', '2026-07-28T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'Generator package release is behind procurement plan', 'Final generator controls have not been released against the fabrication milestone.', 'other', 'critical', 'action_needed', 41000000, 15500000, 94, 'Late equipment release threatens commissioning and contracted energization.', '2026-07-24T13:00:00Z', '2026-07-26T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', null, 'Residence hall framing crew is below plan', 'Weekly staffing averaged 34 carpenters against the committed 46-person crew.', 'vendor', 'medium', 'monitoring', 9600000, 3300000, 81, 'Sustained labor underperformance may consume dry-in float before fall weather.', '2026-07-22T15:00:00Z', '2026-07-31T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008', null, 'Fire alarm permit comments remain open', 'The current life-safety resubmittal retains six authority comments.', 'other', 'high', 'action_needed', 17000000, 5800000, 89, 'Open authority comments can delay inspections and phased occupancy.', '2026-07-21T18:00:00Z', '2026-07-27T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'Mechanical change directive lacks final pricing', 'Field work is proceeding under a signed directive while final labor pricing remains pending.', 'contract', 'medium', 'monitoring', 11200000, 4400000, 84, 'Delayed pricing reduces cost visibility and weakens timely change management.', '2026-07-20T17:00:00Z', '2026-08-01T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', 'Concrete washout controls need environmental review', 'The logistics revision relocates washout near an active storm drain.', 'other', 'low', 'monitoring', 0, 0, 78, 'Controls should be reviewed before the next foundation placement.', '2026-07-19T14:00:00Z', '2026-07-30T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000009', null, 'Closeout warranty index was incomplete', 'The initial owner handoff omitted two equipment warranty records.', 'documentation', 'low', 'monitoring', 1800000, 400000, 87, 'Incomplete closeout records delay final acceptance and operational handoff.', '2026-06-04T14:00:00Z', '2026-06-12T17:00:00Z'),
  ('60000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000010', null, 'Utility easement language needs owner confirmation', 'Planning documents contain conflicting limits for the permanent access easement.', 'contract', 'medium', 'monitoring', 0, 0, 72, 'Resolving easement limits before procurement avoids redesign and delayed access.', '2026-07-24T19:00:00Z', null);

update public.risks
set status = 'resolved', resolved_at = '2026-07-15T14:30:00Z'
where id = '60000000-0000-4000-8000-000000000008';

update public.risks
set status = 'resolved', resolved_at = '2026-06-12T17:00:00Z'
where id = '60000000-0000-4000-8000-000000000015';

insert into public.risk_resolutions (
  id, organization_id, risk_id, resolved_by_user_id, final_owner_user_id,
  resolution_type, summary, resolved_date, resolved_at, completed_action_ids,
  exposure_before_cents, remaining_exposure_cents,
  estimated_loss_avoided_cents, warning_useful, prediction_accurate,
  internal_notes, initial_prediction
) values (
  'b0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000008',
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'mitigated',
  'The superintendent completed and documented the competent-person inspection before excavation work resumed.',
  '2026-07-15',
  '2026-07-15T14:30:00Z',
  '{}',
  5000000,
  500000,
  3500000,
  true,
  true,
  'Seeded deterministic resolution for the V2 value summary.',
  jsonb_build_object(
    'title', 'Open excavation lacks documented daily inspection',
    'category', 'safety',
    'severity', 'high',
    'confidenceScore', 90,
    'potentialExposureCents', 5000000,
    'estimatedMarginImpactCents', 1000000,
    'detectedAt', '2026-07-14T14:00:00Z'
  )
);

insert into public.risk_evidence (
  id, organization_id, risk_id, document_id, integration_source_id, evidence_type,
  title, why_it_matters, excerpt, source_label, source_location, relevance_score,
  support_type, occurred_at
)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'insurance_expiration', 'Certificate expiration date', 'The current certificate lists a policy expiration during active electrical work.', 'Policy expiration: July 25, 2026', 'Apex Electrical certificate of insurance', 'Certificate details', 98, 'direct', '2026-07-18T12:00:00Z'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'schedule_event', 'Pour overlaps forecast storm', 'The lookahead schedules slab placement during the current storm window.', 'Place slab S2 Friday, 5:00 AM–4:00 PM', 'Riverfront three-week lookahead', 'Slab S2 activity', 94, 'direct', '2026-07-18T12:15:00Z'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'daily_log_entry', 'Repeated owner field direction', 'Daily logs on three shifts record added backing requested in the field.', 'Owner representative directed added backing at lobby feature wall; T&M tags pending.', 'Northgate daily field log', 'Lobby feature wall entry', 91, 'direct', '2026-07-18T12:30:00Z');

insert into public.recommended_actions (
  id, organization_id, risk_id, owner_user_id, title, description, action_type,
  status, priority, due_at, created_by_user_id, source
)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Obtain renewed insurance certificate', 'Require Apex to provide a compliant renewal certificate before its current policy expires.', 'request_document', 'suggested', 'urgent', '2026-07-20T17:00:00Z', '11000000-0000-4000-8000-000000000001', 'deterministic_rule'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'Approve a weather contingency plan', 'Confirm an alternate pour window or protected placement plan before releasing Friday labor and pump reservations.', 'update_schedule', 'suggested', 'high', '2026-07-20T16:00:00Z', '11000000-0000-4000-8000-000000000001', 'deterministic_rule'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', 'Issue written notice and price the added scope', 'Send contractual notice, preserve daily records, and submit a ROM before further owner-directed backing proceeds.', 'email', 'suggested', 'urgent', '2026-07-21T17:00:00Z', '11000000-0000-4000-8000-000000000001', 'deterministic_rule'),
  ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', '11000000-0000-4000-8000-000000000002', 'Retest corrected window mockup', 'Complete the witnessed retest before releasing repeated envelope installation.', 'request_document', 'accepted', 'high', '2026-07-25T20:00:00Z', '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000010', '11000000-0000-4000-8000-000000000001', 'Release generator controls package', 'Resolve final controls and authorize the vendor fabrication release.', 'contact_vendor', 'suggested', 'urgent', '2026-07-24T17:00:00Z', '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000011', null, 'Confirm framing manpower recovery', 'Obtain a dated staffing plan and verify daily crew counts.', 'contact_vendor', 'suggested', 'high', '2026-07-30T17:00:00Z', '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000002', 'Close life-safety permit comments', 'Coordinate responses and submit the complete fire-alarm revision.', 'request_document', 'in_progress', 'urgent', '2026-07-23T17:00:00Z', '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000013', '11000000-0000-4000-8000-000000000001', 'Finalize mechanical directive pricing', 'Reconcile labor backup and submit final change pricing.', 'email', 'in_progress', 'normal', '2026-07-22T17:00:00Z', '11000000-0000-4000-8000-000000000001', 'human');

update public.recommended_actions
set status = 'completed', completed_at = '2026-07-24T18:00:00Z'
where id = '80000000-0000-4000-8000-000000000008';

insert into public.risk_email_drafts (
  id, organization_id, risk_id, recommended_action_id, created_by_user_id,
  intended_recipient_role, desired_tone, suggested_urgency, subject, body,
  evidence_ids, generation_source, provider, model_name, prompt_version,
  latency_ms, input_tokens, output_tokens, total_tokens
)
values (
  'a0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'Vendor contact', 'concise', 'soon',
  'Apex Electrical: updated certificate of insurance',
  E'Hello,\n\nI’m following up for Cedar Grove Medical Pavilion. Policy expiration: July 25, 2026\n\nPlease provide an updated certificate of insurance by July 23.\n\nThank you,\nMatt Anderson',
  array['70000000-0000-4000-8000-000000000001']::uuid[],
  'deterministic_fallback', 'deterministic', 'deterministic-template-v1',
  'risk-email-draft-v1', 0, null, null, null
);

insert into public.risk_activities (
  organization_id, risk_id, actor_type, actor_user_id, activity_type, summary,
  metadata, occurred_at
)
values (
  '10000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  'system', null, 'email_drafted',
  'Seed email draft created for human review.',
  '{"draftId":"a0000000-0000-4000-8000-000000000001","generationSource":"deterministic_fallback"}'::jsonb,
  '2026-07-25T12:45:00Z'
);

insert into public.risk_activities (
  organization_id, risk_id, actor_type, actor_user_id, activity_type, summary, occurred_at
)
select
  organization_id,
  id,
  'system',
  null,
  'risk_detected',
  'Deterministic V1 seed risk created for local development.',
  detected_at
from public.risks;

insert into public.daily_briefs (
  id, organization_id, brief_date, status, headline, introduction
)
values (
  '90000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '2026-07-18',
  'draft',
  'Three issues need executive attention this week',
  'The highest-priority profit risks are an expiring insurance certificate, a weather-sensitive concrete placement, and undocumented owner-directed work.'
);

insert into public.brief_items (
  id, organization_id, daily_brief_id, risk_id, priority, headline, summary,
  recommended_next_step
)
values
  ('91000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 1, 'Renew Apex insurance before electrical work is exposed', 'Apex Electrical''s policy expires July 25 while active work remains on the medical pavilion.', 'Require a compliant renewal certificate by Monday and prepare a stop-work decision if it is not received.'),
  ('91000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 2, 'Protect or move Friday''s Riverfront concrete placement', 'Forecast rain overlaps a major slab placement with $84,000 of estimated margin exposure.', 'Approve an alternate window or weather-protection plan before labor and pump commitments become nonrecoverable.'),
  ('91000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', 3, 'Preserve entitlement for owner-directed lobby work', 'Daily logs show three days of added work without an executed change directive.', 'Issue written notice and a ROM before additional backing proceeds.');

update public.daily_briefs
set status = 'published', published_at = '2026-07-18T13:00:00Z'
where id = '90000000-0000-4000-8000-000000000001';

update public.projects
set projected_margin_cents = case id
  when '20000000-0000-4000-8000-000000000001' then 256500000
  when '20000000-0000-4000-8000-000000000002' then 334400000
  when '20000000-0000-4000-8000-000000000003' then 187625000
  when '20000000-0000-4000-8000-000000000004' then 100800000
  when '20000000-0000-4000-8000-000000000005' then 198900000
  when '20000000-0000-4000-8000-000000000006' then 505800000
  when '20000000-0000-4000-8000-000000000007' then 160650000
  when '20000000-0000-4000-8000-000000000008' then 548000000
  when '20000000-0000-4000-8000-000000000009' then 107800000
  when '20000000-0000-4000-8000-000000000010' then 118400000
  else 0
end;

-- Synthetic, deterministic financial analytics demo data. These records belong
-- only to the local seeded organization and are never created for customers.
insert into public.project_financials (
  project_id, organization_id, currency_code, original_budget_cents,
  committed_cost_cents, actual_cost_cents,
  forecast_cost_to_complete_cents, data_as_of_date
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'USD', 2500000000, 2140000000, 1100000000, 1400000000, '2026-07-24'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'USD', 3700000000, 3480000000, 2200000000, 1750000000, '2026-07-24'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'USD', 1700000000, 980000000, 760000000, null, '2026-07-24'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'USD', 2100000000, 1460000000, 930000000, 1100000000, '2026-07-24'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    'USD', 5100000000, 3260000000, 1740000000, 3500000000, '2026-07-24'
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    'USD', 6200000000, 5350000000, 2810000000, 3700000000, '2026-07-24'
  );

insert into public.financial_change_orders (
  id, organization_id, project_id, title, status, amount_cents, effective_date
) values
  (
    'c1000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Approved imaging suite revisions', 'approved', 100000000, '2026-06-18'
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Pending utility relocation', 'pending', 24000000, null
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'Approved dock equipment package', 'approved', 50000000, '2026-05-29'
  ),
  (
    'c1000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'Pending acceleration directive', 'pending', 85000000, null
  );

insert into public.financial_cash_events (
  id, organization_id, project_id, direction, amount_cents, expected_date,
  source_type, confidence, description
) values
  (
    'c2000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'inflow', 185000000, '2026-08-10', 'payment_schedule', 'high',
    'Scheduled owner progress payment'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'outflow', 132000000, '2026-08-18', 'commitment', 'medium',
    'Committed trade partner payments'
  ),
  (
    'c2000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'inflow', 260000000, '2026-08-14', 'invoice', 'high',
    'Certified July progress billing'
  ),
  (
    'c2000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'outflow', 318000000, '2026-08-21', 'commitment', 'medium',
    'Concrete and steel commitments'
  );

insert into public.portfolio_financial_snapshots (
  organization_id, snapshot_month, currency_code, active_projects,
  portfolio_budget_cents, forecast_cost_cents, net_budget_variance_cents,
  projects_over_budget, projects_under_budget,
  projects_missing_financial_data, completeness, project_metrics,
  calculation_version, calculated_at
) values
  (
    '10000000-0000-4000-8000-000000000001', '2026-05-01', 'USD', 4,
    6300000000, 6250000000, 50000000, 1, 1, 2, 'partial',
    '[{"projectId":"20000000-0000-4000-8000-000000000001","projectName":"Cedar Grove Medical Pavilion","varianceCents":80000000},{"projectId":"20000000-0000-4000-8000-000000000002","projectName":"Riverfront Distribution Center","varianceCents":-30000000}]'::jsonb,
    'financial-analytics-v1', '2026-05-31T23:59:59Z'
  ),
  (
    '10000000-0000-4000-8000-000000000001', '2026-06-01', 'USD', 4,
    6350000000, 6420000000, -70000000, 1, 1, 2, 'partial',
    '[{"projectId":"20000000-0000-4000-8000-000000000001","projectName":"Cedar Grove Medical Pavilion","varianceCents":90000000},{"projectId":"20000000-0000-4000-8000-000000000002","projectName":"Riverfront Distribution Center","varianceCents":-160000000}]'::jsonb,
    'financial-analytics-v1', '2026-06-30T23:59:59Z'
  );

update public.risks
set assigned_user_id = '11000000-0000-4000-8000-000000000001',
    financial_exposure_assessed = true,
    last_assessed_at = updated_at,
    normalized_category_id = case category
      when 'insurance' then 'insurance_claims'
      when 'schedule' then 'schedule'
      when 'weather' then 'environmental'
      when 'contract' then 'contractual'
      when 'documentation' then 'documentation'
      when 'financial' then 'financial'
      when 'vendor' then 'vendor_subcontractor'
      when 'safety' then 'safety'
      else 'other'
    end,
    category_mapping_source = 'structured',
    category_mapping_confidence = 100,
    taxonomy_version = 'portfolio-taxonomy/1.0'
where status not in ('resolved', 'dismissed');

update public.risks
set financial_exposure_assessed = true,
    last_assessed_at = updated_at,
    normalized_category_id = 'safety',
    category_mapping_source = 'structured',
    category_mapping_confidence = 100,
    taxonomy_version = 'portfolio-taxonomy/1.0'
where id = '60000000-0000-4000-8000-000000000008';

update public.risks
set normalized_category_id = case id
      when '60000000-0000-4000-8000-000000000009' then 'quality'
      when '60000000-0000-4000-8000-000000000010' then 'procurement'
      when '60000000-0000-4000-8000-000000000011' then 'labor'
      when '60000000-0000-4000-8000-000000000012' then 'compliance'
      when '60000000-0000-4000-8000-000000000013' then 'change_orders'
      when '60000000-0000-4000-8000-000000000014' then 'environmental'
      when '60000000-0000-4000-8000-000000000016' then 'contractual'
    end,
    category_mapping_source = 'manual',
    category_mapping_confidence = 100,
    taxonomy_version = 'portfolio-taxonomy/1.0'
where id between '60000000-0000-4000-8000-000000000009'
             and '60000000-0000-4000-8000-000000000016';

-- Deliberate quality scenarios: one unowned risk and two risks whose financial
-- exposure has not been assessed. Zero defaults must not render as $0 exposure.
update public.risks set assigned_user_id = null
where id = '60000000-0000-4000-8000-000000000011';
update public.risks
set financial_exposure_assessed = false, last_assessed_at = null
where id in (
  '60000000-0000-4000-8000-000000000014',
  '60000000-0000-4000-8000-000000000016'
);

insert into public.portfolio_risk_snapshots (
  organization_id, snapshot_month, analytics_payload, calculation_version,
  taxonomy_version, ranking_version, data_quality, calculated_at
) values
  (
    '10000000-0000-4000-8000-000000000001', '2026-05-01',
    '{"drivers":[{"category":"schedule","activeRiskCount":2},{"category":"documentation","activeRiskCount":3},{"category":"financial","activeRiskCount":1}]}'::jsonb,
    'risk-analytics/1.0', 'portfolio-taxonomy/1.0',
    'executive-attention/1.0', 'partial', '2026-05-31T23:59:59Z'
  ),
  (
    '10000000-0000-4000-8000-000000000001', '2026-06-01',
    '{"drivers":[{"category":"schedule","activeRiskCount":3},{"category":"documentation","activeRiskCount":2},{"category":"financial","activeRiskCount":2},{"category":"vendor_subcontractor","activeRiskCount":1}]}'::jsonb,
    'risk-analytics/1.0', 'portfolio-taxonomy/1.0',
    'executive-attention/1.0', 'partial', '2026-06-30T23:59:59Z'
  );

update public.risks set detection_key = 'insurance:apex-electrical-systems:cedar-grove-medical-pavilion'
where id = '60000000-0000-4000-8000-000000000001';
update public.risks set detection_key = 'weather:riverfront-distribution-center:2026-07-20'
where id = '60000000-0000-4000-8000-000000000002';
update public.risks set detection_key = 'repeated-issue:northgate-civic-center:added-backing'
where id = '60000000-0000-4000-8000-000000000003';

insert into public.documents (
  id, organization_id, project_id, integration_source_id, name,
  document_type, document_date, processing_status
)
values
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'Northgate daily log - July 15', 'daily_log', '2026-07-15', 'ready'),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'Northgate daily log - July 16', 'daily_log', '2026-07-16', 'ready');

insert into public.project_detection_settings (
  organization_id, project_id, concrete_temperature_threshold_f
)
values (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  95
);

insert into public.document_extracted_fields (
  organization_id, document_id, field_key, field_value, extracted_at
)
values
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'coi_expiration_date', '"2026-07-25"'::jsonb, '2026-07-18T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'concrete_pour_date', '"2026-07-20"'::jsonb, '2026-07-18T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'forecast_high_temperature_f', '101'::jsonb, '2026-07-18T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 'issue_keywords', '["added backing"]'::jsonb, '2026-07-17T17:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004', 'issue_keywords', '["added backing"]'::jsonb, '2026-07-15T17:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000005', 'issue_keywords', '["added backing"]'::jsonb, '2026-07-16T17:00:00Z');

update public.risk_evidence
set detection_key = case risk_id
  when '60000000-0000-4000-8000-000000000001' then 'insurance:apex-electrical-systems:cedar-grove-medical-pavilion:50000000-0000-4000-8000-000000000001'
  when '60000000-0000-4000-8000-000000000002' then 'weather:riverfront-distribution-center:2026-07-20:50000000-0000-4000-8000-000000000002'
  when '60000000-0000-4000-8000-000000000003' then 'repeated-issue:northgate-civic-center:added-backing:50000000-0000-4000-8000-000000000003'
end
where risk_id in (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '60000000-0000-4000-8000-000000000003'
);

update public.recommended_actions
set detection_key = case risk_id
  when '60000000-0000-4000-8000-000000000001' then 'insurance:apex-electrical-systems:cedar-grove-medical-pavilion:action'
  when '60000000-0000-4000-8000-000000000002' then 'weather:riverfront-distribution-center:2026-07-20:action'
  when '60000000-0000-4000-8000-000000000003' then 'repeated-issue:northgate-civic-center:added-backing:action'
end
where risk_id in (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000002',
  '60000000-0000-4000-8000-000000000003'
);

-- Exploration data for the broader V2/V3 product experience. These records
-- deepen existing scenarios without changing the canonical current brief.
insert into public.vendors (
  id, organization_id, name, trade, contact_name, contact_email
)
values
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Westline Building Envelope', 'Glazing and waterproofing', 'Tasha Brooks', 'tasha@westline-envelope.example'),
  ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'High Desert Power & Controls', 'Generators and controls', 'Owen Reed', 'owen@high-desert-power.example'),
  ('30000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Red Oak Life Safety', 'Fire alarm and life safety', 'Priya Shah', 'priya@red-oak-safety.example');

insert into public.project_vendors (
  organization_id, project_id, vendor_id, scope_of_work
)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006', 'Unit glazing and perimeter waterproofing'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'Mechanical systems and controls'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000007', 'Emergency generation and sequence controls'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', 'Foundations and equipment pads'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000005', 'Framing, drywall, and finishes'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', 'Fire alarm and phased life-safety systems'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000004', 'Structural steel and miscellaneous metals'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000003', 'Preconstruction mechanical coordination');

update public.risks
set vendor_id = case id
  when '60000000-0000-4000-8000-000000000009' then '30000000-0000-4000-8000-000000000006'::uuid
  when '60000000-0000-4000-8000-000000000010' then '30000000-0000-4000-8000-000000000007'::uuid
  when '60000000-0000-4000-8000-000000000012' then '30000000-0000-4000-8000-000000000008'::uuid
  else vendor_id
end
where id in (
  '60000000-0000-4000-8000-000000000009',
  '60000000-0000-4000-8000-000000000010',
  '60000000-0000-4000-8000-000000000012'
);

insert into public.documents (
  id, organization_id, project_id, vendor_id, integration_source_id, name,
  document_type, document_date, processing_status
)
values
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000001', 'Juniper Row window mockup test report', 'incident_report', '2026-07-22', 'ready'),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000001', 'Granite Peak generator controls submittal log', 'schedule', '2026-07-23', 'ready'),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000001', 'Market Square fire alarm plan review comments', 'rfi', '2026-07-21', 'ready'),
  ('50000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', 'Mercer residence hall weekly manpower report', 'daily_log', '2026-07-22', 'ready'),
  ('50000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'Juniper Row mechanical change directive 017', 'change_order', '2026-07-20', 'ready'),
  ('50000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000009', null, '40000000-0000-4000-8000-000000000001', 'Harbor Point closeout warranty index', 'other', '2026-06-11', 'ready'),
  ('50000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000010', null, '40000000-0000-4000-8000-000000000001', 'Clearwater utility easement exhibit', 'contract', '2026-07-24', 'ready');

insert into public.risk_evidence (
  id, organization_id, risk_id, document_id, integration_source_id,
  evidence_type, title, why_it_matters, excerpt, source_label,
  source_location, page_number, line_start, line_end, relevance_score,
  support_type, occurred_at
)
values
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', '50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000001', 'document_excerpt', 'Mockup test deficiency', 'The failed perimeter seal must be corrected and retested before the assembly is repeated.', 'Water penetration observed at the east jamb after 11 minutes at the specified pressure differential.', 'Juniper Row window mockup test report', 'Test observation 4.2', 6, null, null, 96, 'direct', '2026-07-22T18:30:00Z'),
  ('70000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', null, null, 'project_metadata', 'Repeated assembly exposure', 'The approved mockup is the control assembly for 184 similar openings.', 'The current installation release covers 184 apartment window openings using the same perimeter detail.', 'Juniper Row project controls', 'Envelope release log', null, null, null, 82, 'inferred', '2026-07-23T14:00:00Z'),
  ('70000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000001', 'schedule_event', 'Fabrication release missed', 'The release milestone controls generator fabrication and downstream commissioning.', 'Controls sequence approval required by July 18; fabrication release remains open as of July 23.', 'Granite Peak generator controls submittal log', 'Long-lead equipment row 12', 3, null, null, 97, 'direct', '2026-07-23T19:00:00Z'),
  ('70000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000001', 'daily_log_entry', 'Crew count below commitment', 'Four consecutive shifts show a material gap between committed and actual staffing.', 'Committed framing crew: 46. Average verified workforce this week: 34.', 'Mercer residence hall weekly manpower report', 'Framing summary', 2, 18, 24, 93, 'direct', '2026-07-22T22:00:00Z'),
  ('70000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000001', 'document_excerpt', 'Open authority comments', 'Unresolved life-safety comments can prevent inspection approval and phased occupancy.', 'Six comments remain open, including notification appliance coverage and sequence matrix revisions.', 'Market Square fire alarm plan review comments', 'Open comments summary', 1, null, null, 95, 'direct', '2026-07-21T20:00:00Z'),
  ('70000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000001', 'contract_clause', 'Pricing remains provisional', 'The directive authorizes work but requires timely backup and final pricing.', 'Contractor shall proceed on time and material while labor and material backup is reconciled for final change pricing.', 'Juniper Row mechanical change directive 017', 'Pricing basis', 2, 31, 36, 92, 'direct', '2026-07-20T17:00:00Z'),
  ('70000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000015', '50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000001', 'document_excerpt', 'Warranty records omitted', 'The closeout index confirms the two records that delayed owner acceptance.', 'Missing at initial issue: AHU-3 motor warranty and domestic booster pump warranty.', 'Harbor Point closeout warranty index', 'Outstanding warranties', 4, null, null, 94, 'direct', '2026-06-11T16:00:00Z'),
  ('70000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000016', '50000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000001', 'contract_clause', 'Conflicting easement widths', 'The exhibit and planning narrative must align before site utility design is released.', 'Civil exhibit identifies a 24-foot access easement; planning narrative identifies a 20-foot permanent easement.', 'Clearwater utility easement exhibit', 'Easement note 7', 5, null, null, 88, 'direct', '2026-07-24T19:00:00Z'),
  ('70000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000016', null, null, 'manual_note', 'Owner confirmation not yet received', 'This is missing information rather than proof of the final easement requirement.', 'Owner confirmation of the controlling easement width is still pending.', 'Preconstruction coordination note', 'Open decisions log', null, null, null, 64, 'assumption', '2026-07-24T20:00:00Z');

insert into public.recommended_actions (
  id, organization_id, risk_id, owner_user_id, title, description,
  action_type, status, priority, due_at, completed_at, dismissed_at,
  dismissal_reason, created_by_user_id, source
)
values
  ('80000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000002', 'Escalate switchgear submittal review', 'Confirm the remaining reviewer and obtain a dated approval commitment.', 'email', 'accepted', 'high', '2026-07-27T17:00:00Z', null, null, null, '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000005', '11000000-0000-4000-8000-000000000002', 'Close corridor coordination clashes', 'Lead a focused trade review and record disposition for all nine corridor clashes.', 'schedule_meeting', 'in_progress', 'normal', '2026-07-29T17:00:00Z', null, null, null, '11000000-0000-4000-8000-000000000002', 'human'),
  ('80000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000001', 'Validate steel recovery productivity', 'Compare installed tonnage against overtime hours before approving another recovery week.', 'review_document', 'completed', 'normal', '2026-07-23T17:00:00Z', '2026-07-23T15:40:00Z', null, null, '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000007', null, 'Request a dated manpower recovery plan', 'Ask Golden State Interiors to confirm crew ramp-up by shift and work area.', 'contact_vendor', 'suggested', 'high', '2026-07-30T17:00:00Z', null, null, null, '11000000-0000-4000-8000-000000000002', 'human'),
  ('80000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', '11000000-0000-4000-8000-000000000002', 'Hold repeated window installation', 'Keep the repeated opening release on hold until the corrected mockup passes witnessed testing.', 'add_mitigation', 'in_progress', 'urgent', '2026-07-28T17:00:00Z', null, null, null, '11000000-0000-4000-8000-000000000001', 'human'),
  ('80000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000012', '11000000-0000-4000-8000-000000000002', 'Confirm resubmittal completeness', 'Review all six authority comments against the revised fire alarm package before upload.', 'review_document', 'accepted', 'high', '2026-07-27T16:00:00Z', null, null, null, '11000000-0000-4000-8000-000000000002', 'human'),
  ('80000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000014', null, 'Relocate concrete washout immediately', 'Superseded by the revised logistics plan that moved washout to the north laydown yard.', 'update_schedule', 'dismissed', 'low', null, null, '2026-07-21T18:20:00Z', 'The approved logistics revision already removed the condition.', '11000000-0000-4000-8000-000000000002', 'human'),
  ('80000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000016', null, 'Confirm controlling utility easement', 'Obtain written owner direction identifying the controlling easement exhibit.', 'request_document', 'suggested', 'normal', '2026-08-03T17:00:00Z', null, null, null, '11000000-0000-4000-8000-000000000001', 'human');

update public.recommended_actions
set status = 'accepted'
where id = '80000000-0000-4000-8000-000000000005';

insert into public.risk_activities (
  organization_id, risk_id, actor_type, actor_user_id, activity_type,
  summary, metadata, mentioned_user_ids, occurred_at
)
values
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', 'integration', null, 'document_uploaded', 'Window mockup test report was added from project records.', '{"documentId":"50000000-0000-4000-8000-000000000006"}'::jsonb, '{}', '2026-07-22T18:35:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', 'system', null, 'evidence_added', 'Mockup test deficiency was linked as direct evidence.', '{"evidenceId":"70000000-0000-4000-8000-000000000004","supportType":"direct"}'::jsonb, '{}', '2026-07-23T14:02:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', 'user', '11000000-0000-4000-8000-000000000002', 'comment_added', 'Alex asked the envelope team to keep the repeated installation release on hold.', '{"body":"Keep the repeated opening release on hold until the witnessed retest passes."}'::jsonb, '{}', '2026-07-23T16:10:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009', 'user', '11000000-0000-4000-8000-000000000001', 'owner_assigned', 'Matt assigned the window mockup follow-up to Alex Rivera.', '{"ownerUserId":"11000000-0000-4000-8000-000000000002"}'::jsonb, array['11000000-0000-4000-8000-000000000002']::uuid[], '2026-07-23T16:25:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000010', 'ai', null, 'system_analysis_completed', 'AI-assisted analysis summarized the generator release evidence for human review.', '{"evidenceIds":["70000000-0000-4000-8000-000000000006"],"reviewStatus":"reviewed"}'::jsonb, '{}', '2026-07-24T13:05:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000010', 'user', '11000000-0000-4000-8000-000000000001', 'action_accepted', 'Matt accepted the generator controls release action.', '{"actionId":"80000000-0000-4000-8000-000000000005"}'::jsonb, '{}', '2026-07-24T13:18:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000012', 'integration', null, 'document_uploaded', 'Fire alarm plan review comments were added from project records.', '{"documentId":"50000000-0000-4000-8000-000000000008"}'::jsonb, '{}', '2026-07-21T20:03:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000012', 'user', '11000000-0000-4000-8000-000000000002', 'comment_added', 'Alex asked Matt to confirm the phased occupancy date before the resubmittal.', '{"body":"Matt, please confirm whether the September phased occupancy date is still controlling."}'::jsonb, array['11000000-0000-4000-8000-000000000001']::uuid[], '2026-07-22T17:45:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000013', 'user', '11000000-0000-4000-8000-000000000001', 'action_completed', 'Matt completed the initial mechanical pricing reconciliation.', '{"actionId":"80000000-0000-4000-8000-000000000008"}'::jsonb, '{}', '2026-07-24T18:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000014', 'system', null, 'action_dismissed', 'The washout relocation action was dismissed after the logistics plan changed.', '{"actionId":"80000000-0000-4000-8000-000000000015","reason":"The approved logistics revision already removed the condition."}'::jsonb, '{}', '2026-07-21T18:20:00Z'),
  ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000016', 'user', '11000000-0000-4000-8000-000000000001', 'comment_added', 'Matt documented the missing owner confirmation for the easement width.', '{"body":"Do not release utility design until the owner identifies the controlling exhibit."}'::jsonb, '{}', '2026-07-24T20:05:00Z');

insert into public.daily_briefs (
  id, organization_id, brief_date, status, headline, introduction, published_at
)
values (
  '90000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '2026-07-17',
  'published',
  'Coordination and procurement need attention',
  'Yesterday''s brief focused on switchgear review, mechanical coordination, and steel recovery productivity.',
  '2026-07-17T13:00:00Z'
);

insert into public.brief_items (
  id, organization_id, daily_brief_id, risk_id, priority, headline, summary,
  recommended_next_step
)
values
  ('91000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000004', 1, 'Escalate switchgear review before procurement float is consumed', 'The review duration is ten days beyond the contractual period.', 'Identify the remaining reviewer and obtain a written approval date.'),
  ('91000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000005', 2, 'Close corridor clashes before framing release', 'Nine ceiling-space clashes remain unresolved across coordinated trades.', 'Hold a focused coordination review and record each clash disposition.'),
  ('91000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000006', 3, 'Validate whether steel overtime is producing recovery', 'Overtime is above plan for a second week without verified productivity gain.', 'Compare installed tonnage with overtime hours before approving another recovery week.');
