drop index if exists public.risk_activities_risk_date_idx;
alter table public.risk_activities drop constraint if exists risk_activities_check;
alter table public.risk_activities alter column activity_type type text using activity_type::text;
alter table public.risk_activities rename column note to summary;
alter table public.risk_activities
  add column actor_type text,
  add column mentioned_user_ids uuid[] not null default '{}'::uuid[];

update public.risk_activities
set actor_type = case when actor_user_id is null then 'system' else 'user' end,
summary = coalesce(nullif(trim(summary), ''), 'Risk activity recorded.');

alter table public.risk_activities
  alter column actor_type set not null,
  alter column summary set not null,
  add constraint risk_activities_actor_type_check
    check (actor_type in ('user', 'system', 'ai', 'integration')),
  add constraint risk_activities_actor_user_check
    check ((actor_type = 'user' and actor_user_id is not null) or (actor_type <> 'user' and actor_user_id is null)),
  add constraint risk_activities_type_check
    check (activity_type in (
      'risk_detected', 'risk_acknowledged', 'risk_updated', 'status_changed',
      'severity_changed', 'owner_assigned', 'due_date_changed', 'action_suggested',
      'action_accepted', 'action_started', 'action_completed', 'action_dismissed',
      'evidence_added', 'document_uploaded', 'email_drafted', 'comment_added',
      'risk_resolved', 'risk_reopened', 'system_analysis_completed',
      'created', 'assigned', 'commented', 'action_updated', 'resolved', 'dismissed'
    )),
  add constraint risk_activities_status_change_check
    check (activity_type <> 'status_changed' or (from_status is not null and to_status is not null and from_status <> to_status));

alter table public.risk_activities
  drop constraint if exists risk_activities_actor_user_id_organization_id_fkey;
alter table public.risk_activities
  add constraint risk_activities_actor_user_id_organization_id_fkey
  foreign key (actor_user_id, organization_id)
  references public.users(id, organization_id) on delete restrict;

create index risk_activities_organization_cursor_idx
  on public.risk_activities (organization_id, occurred_at desc, id desc);
create index risk_activities_risk_cursor_idx
  on public.risk_activities (risk_id, occurred_at desc, id desc);
create index risk_activities_actor_idx
  on public.risk_activities (organization_id, actor_type, occurred_at desc);

create or replace function public.prevent_risk_activity_changes()
returns trigger language plpgsql as $$
begin
  raise exception 'Risk activity is append-only; create a correcting activity instead.';
end;
$$;

create trigger risk_activities_prevent_update
before update on public.risk_activities
for each row execute function public.prevent_risk_activity_changes();
create trigger risk_activities_prevent_delete
before delete on public.risk_activities
for each row execute function public.prevent_risk_activity_changes();
