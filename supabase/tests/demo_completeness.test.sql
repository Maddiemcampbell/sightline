begin;
select plan(14);

select is((select count(*)::integer from public.organizations
  where id='10000000-0000-4000-8000-000000000001'),1,'one designated demo organization exists');
select cmp_ok((select count(*)::integer from public.projects
  where organization_id='10000000-0000-4000-8000-000000000001'),'>=',10,'demo has a meaningful project portfolio');
select cmp_ok((select count(*)::integer from public.projects
  where organization_id='10000000-0000-4000-8000-000000000001' and status='active'),'>=',8,'demo has eight active projects');
select cmp_ok((select count(*)::integer from public.project_financials
  where organization_id='10000000-0000-4000-8000-000000000001'),'>=',6,'demo includes complete and partial financial scenarios');
select cmp_ok((select count(distinct normalized_category_id)::integer from public.risks
  where organization_id='10000000-0000-4000-8000-000000000001'),'>=',12,'demo exercises the normalized taxonomy');
select is((select count(distinct severity)::integer from public.risks
  where organization_id='10000000-0000-4000-8000-000000000001'),4,'demo exercises every severity');
select cmp_ok((select count(*)::integer from public.recommended_actions
  where organization_id='10000000-0000-4000-8000-000000000001'
    and status not in ('completed','dismissed') and due_at<'2026-07-25T12:00:00Z'),'>=',3,'demo includes overdue actions');
select cmp_ok((select count(*)::integer from public.recommended_actions
  where organization_id='10000000-0000-4000-8000-000000000001'
    and due_at::date='2026-07-25'),'>=',1,'demo includes a due-today action');
select cmp_ok((select count(*)::integer from public.recommended_actions
  where organization_id='10000000-0000-4000-8000-000000000001'
    and status='completed'),'>=',1,'demo includes a recently completed action');
select cmp_ok((select count(*)::integer from public.risks
  where organization_id='10000000-0000-4000-8000-000000000001'
    and assigned_user_id is null and status not in ('resolved','dismissed')),'>=',1,'demo includes an unowned risk');
select cmp_ok((select count(*)::integer from public.risks
  where organization_id='10000000-0000-4000-8000-000000000001'
    and not financial_exposure_assessed),'>=',2,'demo distinguishes unassessed exposure from zero');
select cmp_ok((select count(*)::integer from public.portfolio_risk_snapshots
  where organization_id='10000000-0000-4000-8000-000000000001'),'>=',2,'demo includes prior risk snapshots');
select is((select count(*)::integer from public.projects
  where organization_id='10000000-0000-4000-8000-000000000001'
    and image_url is not null),3,'exactly three demo projects include rendered cover images');
select is((select count(*)::integer from public.projects
  where organization_id='10000000-0000-4000-8000-000000000001'
    and image_url is null),7,'seven demo projects exercise fallback cover artwork');

select * from finish();
rollback;
