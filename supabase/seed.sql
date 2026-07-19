-- Deterministic development seed for Sightline V1.

insert into public.organizations (id, name, slug, timezone)
values ('10000000-0000-4000-8000-000000000001', 'BuildCo Construction', 'buildco-construction', 'America/Los_Angeles');

insert into public.users (id, organization_id, email, full_name, title, role)
values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'maddiemcampbell@gmail.com',
  'Matt Anderson',
  'Operations Director',
  'executive'
);

insert into public.projects (
  id, organization_id, name, project_number, status, address_line_1, city, state_code,
  postal_code, contract_value_cents, start_date, target_completion_date
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Cedar Grove Medical Pavilion', 'BC-24017', 'active', '1800 Cedar Grove Way', 'Sacramento', 'CA', '95814', 2850000000, '2026-01-12', '2027-03-26'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Riverfront Distribution Center', 'BC-24022', 'active', '450 Harbor Industrial Road', 'Stockton', 'CA', '95203', 4180000000, '2025-11-03', '2026-12-18'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Northgate Civic Center', 'BC-25004', 'active', '900 Northgate Plaza', 'Roseville', 'CA', '95678', 1975000000, '2026-03-02', '2027-01-29'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Sierra Vista High School Modernization', 'BC-25009', 'active', '72 Falcon Drive', 'Folsom', 'CA', '95630', 1260000000, '2026-05-18', '2027-06-11');

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
  ('60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', null, 'Open excavation lacks documented daily inspection', 'The last two excavation shifts do not include a competent-person inspection record.', 'safety', 'high', 'monitoring', 5000000, 1000000, 90, 'Missing inspection records expose the project to preventable safety and compliance risk.', '2026-07-14T14:00:00Z', '2026-07-15T15:00:00Z');

update public.risks
set status = 'resolved', resolved_at = '2026-07-15T14:30:00Z'
where id = '60000000-0000-4000-8000-000000000008';

insert into public.risk_evidence (
  id, organization_id, risk_id, document_id, integration_source_id, title,
  description, source_excerpt, observed_at
)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Certificate expiration date', 'The current certificate lists a policy expiration during active electrical work.', 'Policy expiration: July 25, 2026', '2026-07-18T12:00:00Z'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'Pour overlaps forecast storm', 'The lookahead schedules slab placement during the current storm window.', 'Place slab S2 Friday, 5:00 AM–4:00 PM', '2026-07-18T12:15:00Z'),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'Repeated owner field direction', 'Daily logs on three shifts record added backing requested in the field.', 'Owner representative directed added backing at lobby feature wall; T&M tags pending.', '2026-07-18T12:30:00Z');

insert into public.recommended_actions (
  id, organization_id, risk_id, assigned_user_id, title, description, status, due_at
)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Obtain renewed insurance certificate', 'Require Apex to provide a compliant renewal certificate before its current policy expires.', 'open', '2026-07-20T17:00:00Z'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'Approve a weather contingency plan', 'Confirm an alternate pour window or protected placement plan before releasing Friday labor and pump reservations.', 'open', '2026-07-20T16:00:00Z'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', 'Issue written notice and price the added scope', 'Send contractual notice, preserve daily records, and submit a ROM before further owner-directed backing proceeds.', 'open', '2026-07-21T17:00:00Z');

insert into public.risk_activities (
  organization_id, risk_id, actor_user_id, activity_type, note, occurred_at
)
select
  organization_id,
  id,
  '11000000-0000-4000-8000-000000000001',
  'created',
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
  else 0
end;

update public.risks
set assigned_user_id = '11000000-0000-4000-8000-000000000001'
where status not in ('resolved', 'dismissed');

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
