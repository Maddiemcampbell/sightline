alter table public.projects
  add column projected_margin_cents bigint not null default 0
  constraint projects_projected_margin_nonnegative check (projected_margin_cents >= 0);

alter table public.risks
  add column assigned_user_id uuid;

alter table public.risks
  add constraint risks_assigned_user_organization_fkey
  foreign key (assigned_user_id, organization_id)
  references public.users(id, organization_id)
  on delete set null (assigned_user_id);

create index risks_organization_assigned_user_idx
  on public.risks (organization_id, assigned_user_id)
  where assigned_user_id is not null;
