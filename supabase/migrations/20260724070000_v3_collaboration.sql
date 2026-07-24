-- V3.1 collaboration primitives. Notifications are in-app only.

alter table public.notification_placeholders rename to notifications;
alter table public.notifications
  add column actor_membership_id uuid,
  add column notification_type text,
  add column title text,
  add column body text,
  add column href text,
  add column read_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add foreign key (actor_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null;

update public.notifications set
  notification_type = case
    when event_type in ('mention', 'assignment', 'role_change', 'invitation',
      'project_added', 'risk_assigned', 'action_completed') then event_type
    when event_type = 'member_role_changed' then 'role_change'
    when event_type like '%invitation%' then 'invitation'
    when event_type = 'project_assignment_changed' then 'project_added'
    else 'assignment'
  end,
  title = coalesce(payload ->> 'title', initcap(replace(event_type, '_', ' '))),
  body = coalesce(payload ->> 'body', ''),
  href = payload ->> 'href';

alter table public.notifications
  alter column notification_type set not null,
  alter column title set not null,
  alter column body set not null,
  add constraint notifications_type_check check (notification_type in (
    'mention', 'assignment', 'role_change', 'invitation', 'project_added',
    'risk_assigned', 'action_completed'
  )),
  add constraint notifications_title_length check (char_length(title) between 1 and 160),
  add constraint notifications_body_length check (char_length(body) <= 1000),
  add constraint notifications_href_local check (href is null or href ~ '^/[A-Za-z0-9/_?&=.-]*$');

alter table public.notifications drop column event_type;
alter table public.notifications drop column delivered_at;
drop index if exists public.notification_placeholders_recipient_idx;
create index notifications_unread_recipient_idx
  on public.notifications (recipient_membership_id, created_at desc)
  where read_at is null;
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

create or replace function public.protect_notification_content()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - array['read_at', 'updated_at'])
    <> (to_jsonb(old) - array['read_at', 'updated_at'])
  then raise exception 'Notification recipients may only change read state';
  end if;
  return new;
end;
$$;
create trigger notifications_protect_content before update on public.notifications
  for each row execute function public.protect_notification_content();

drop policy if exists notification_placeholders_recipient_select on public.notifications;
create policy notifications_recipient_select on public.notifications
  for select to authenticated using (
    exists (
      select 1 from public.organization_memberships membership
      where membership.id = recipient_membership_id
        and membership.organization_id = organization_id
        and membership.auth_user_id = (select auth.uid())
    )
  );
create policy notifications_recipient_update on public.notifications
  for update to authenticated
  using (
    exists (
      select 1 from public.organization_memberships membership
      where membership.id = recipient_membership_id
        and membership.organization_id = organization_id
        and membership.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.organization_memberships membership
      where membership.id = recipient_membership_id
        and membership.organization_id = organization_id
        and membership.auth_user_id = (select auth.uid())
    )
  );

create table public.collaboration_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  subject_type text not null check (subject_type in ('project', 'risk', 'action', 'document')),
  subject_id uuid not null,
  author_membership_id uuid not null,
  body_markdown text not null check (char_length(trim(body_markdown)) between 1 and 10000),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by_membership_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (author_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete restrict,
  foreign key (deleted_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null
);

create table public.comment_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  comment_id uuid not null,
  body_markdown text not null,
  edited_by_membership_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (comment_id, organization_id)
    references public.collaboration_comments(id, organization_id) on delete cascade,
  foreign key (edited_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete restrict
);

create table public.comment_mentions (
  organization_id uuid not null,
  comment_id uuid not null,
  mentioned_membership_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_membership_id),
  foreign key (comment_id, organization_id)
    references public.collaboration_comments(id, organization_id) on delete cascade,
  foreign key (mentioned_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade
);

create table public.comment_reactions (
  organization_id uuid not null,
  comment_id uuid not null,
  membership_id uuid not null,
  reaction text not null check (reaction in ('like', 'celebrate', 'eyes', 'resolved')),
  created_at timestamptz not null default now(),
  primary key (comment_id, membership_id, reaction),
  foreign key (comment_id, organization_id)
    references public.collaboration_comments(id, organization_id) on delete cascade,
  foreign key (membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade
);

create table public.assignment_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  subject_type text not null check (subject_type in ('risk', 'action')),
  subject_id uuid not null,
  previous_assignee_user_id uuid,
  assignee_user_id uuid,
  assigned_by_membership_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (previous_assignee_user_id, organization_id)
    references public.users(id, organization_id) on delete set null,
  foreign key (assignee_user_id, organization_id)
    references public.users(id, organization_id) on delete set null,
  foreign key (assigned_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete restrict
);

create table public.resource_presence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  membership_id uuid not null,
  resource_type text not null check (resource_type in ('project', 'risk', 'action', 'document')),
  resource_id uuid not null,
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, membership_id, resource_type, resource_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade
);

alter table public.projects add column updated_by_user_id uuid;
alter table public.risks add column updated_by_user_id uuid;
alter table public.recommended_actions add column updated_by_user_id uuid;
alter table public.documents add column updated_by_user_id uuid;
alter table public.projects add foreign key (updated_by_user_id, organization_id)
  references public.users(id, organization_id) on delete set null;
alter table public.risks add foreign key (updated_by_user_id, organization_id)
  references public.users(id, organization_id) on delete set null;
alter table public.recommended_actions add foreign key (updated_by_user_id, organization_id)
  references public.users(id, organization_id) on delete set null;
alter table public.documents add foreign key (updated_by_user_id, organization_id)
  references public.users(id, organization_id) on delete set null;

create index collaboration_comments_subject_idx
  on public.collaboration_comments (organization_id, subject_type, subject_id, created_at);
create index comment_revisions_comment_idx on public.comment_revisions (comment_id, created_at);
create index assignment_history_subject_idx
  on public.assignment_history (organization_id, subject_type, subject_id, created_at desc);
create index resource_presence_resource_idx
  on public.resource_presence (organization_id, resource_type, resource_id, last_viewed_at desc);

create trigger collaboration_comments_set_updated_at before update on public.collaboration_comments
  for each row execute function public.set_updated_at();
create trigger resource_presence_set_updated_at before update on public.resource_presence
  for each row execute function public.set_updated_at();

alter table public.collaboration_comments enable row level security;
alter table public.comment_revisions enable row level security;
alter table public.comment_mentions enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.assignment_history enable row level security;
alter table public.resource_presence enable row level security;

create policy collaboration_comments_project_select on public.collaboration_comments
  for select to authenticated using ((select public.can_access_project(organization_id, project_id)));
create policy comment_revisions_project_select on public.comment_revisions
  for select to authenticated using (exists (
    select 1 from public.collaboration_comments comment
    where comment.id = comment_id and comment.organization_id = organization_id
      and (select public.can_access_project(comment.organization_id, comment.project_id))
  ));
create policy comment_mentions_project_select on public.comment_mentions
  for select to authenticated using (exists (
    select 1 from public.collaboration_comments comment
    where comment.id = comment_id and comment.organization_id = organization_id
      and (select public.can_access_project(comment.organization_id, comment.project_id))
  ));
create policy comment_reactions_project_select on public.comment_reactions
  for select to authenticated using (exists (
    select 1 from public.collaboration_comments comment
    where comment.id = comment_id and comment.organization_id = organization_id
      and (select public.can_access_project(comment.organization_id, comment.project_id))
  ));
create policy assignment_history_project_select on public.assignment_history
  for select to authenticated using ((select public.can_access_project(organization_id, project_id)));
create policy resource_presence_project_select on public.resource_presence
  for select to authenticated using (
    (project_id is null and (select public.is_organization_member(organization_id)))
    or (project_id is not null and (select public.can_access_project(organization_id, project_id)))
  );

grant select on public.collaboration_comments, public.comment_revisions,
  public.comment_mentions, public.comment_reactions, public.assignment_history,
  public.resource_presence to authenticated;
grant update on public.notifications to authenticated;
grant all on public.collaboration_comments, public.comment_revisions,
  public.comment_mentions, public.comment_reactions, public.assignment_history,
  public.resource_presence, public.notifications to service_role;

comment on table public.notifications is 'In-app notification inbox; delivery channels intentionally out of scope.';
comment on table public.comment_revisions is 'Append-only comment edit history.';
comment on table public.assignment_history is 'Append-only risk and action assignment history.';
