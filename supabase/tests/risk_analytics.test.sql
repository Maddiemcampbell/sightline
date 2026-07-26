begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_column('public','risks','normalized_category_id','risk normalization is persisted separately');
select has_column('public','risks','financial_exposure_assessed','exposure assessment state is explicit');
select has_table('public','portfolio_risk_snapshots','monthly risk snapshots exist');
select col_type_is('public','risks','normalized_category_id','text','normalized category uses a stable text identifier');
select policies_are('public','portfolio_risk_snapshots',
  array['portfolio_risk_snapshots_owner_select','portfolio_risk_snapshots_service_all'],
  'risk snapshots have only documented policies');
select isnt_empty(
  $$select indexname from pg_indexes where schemaname='public'
    and indexname='risks_organization_normalized_category_idx'$$,
  'normalized category lookup is indexed');

select * from finish();
rollback;
