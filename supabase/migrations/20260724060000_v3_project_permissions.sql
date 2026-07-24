-- V3.1 project-scoped roles, invitations, and derived-resource isolation.

alter table public.project_memberships
  add column role text not null default 'contributor'
    check (role in ('owner', 'manager', 'contributor', 'viewer')),
  add column last_active_at timestamptz,
  add column updated_at timestamptz not null default now();

create trigger project_memberships_set_updated_at
  before update on public.project_memberships
  for each row execute function public.set_updated_at();

create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  email text not null check (email = lower(trim(email))),
  role text not null check (role in ('owner', 'manager', 'contributor', 'viewer')),
  token_hash text not null unique check (char_length(token_hash) = 64),
  invited_by_membership_id uuid not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_membership_id uuid,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count integer not null default 1 check (send_count > 0),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (invited_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  foreign key (accepted_by_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete set null,
  check (expires_at > created_at),
  check (accepted_at is null or revoked_at is null)
);

create unique index project_invitations_pending_email_idx
  on public.project_invitations (project_id, email)
  where accepted_at is null and revoked_at is null;
create index project_invitations_organization_project_idx
  on public.project_invitations (organization_id, project_id, created_at desc);
create index project_memberships_project_role_idx
  on public.project_memberships (organization_id, project_id, role);

alter table public.project_invitations enable row level security;
grant all on public.project_invitations to service_role;

create or replace function public.current_project_role(
  target_organization_id uuid,
  target_project_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select assignment.role
  from public.project_memberships assignment
  join public.organization_memberships membership
    on membership.id = assignment.organization_membership_id
   and membership.organization_id = assignment.organization_id
  where assignment.organization_id = target_organization_id
    and assignment.project_id = target_project_id
    and membership.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_project_role(uuid, uuid) from public;
grant execute on function public.current_project_role(uuid, uuid)
  to authenticated, service_role;

create policy project_invitations_project_manager_select
  on public.project_invitations for select to authenticated using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (select public.current_project_role(organization_id, project_id))
      in ('owner', 'manager')
    or email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
grant select on public.project_invitations to authenticated;

drop policy if exists team_activity_events_member_select
  on public.team_activity_events;
create policy team_activity_events_scope_select
  on public.team_activity_events for select to authenticated using (
    (select public.is_organization_member(organization_id))
    and (
      not (metadata ? 'projectId')
      or (
        (metadata ->> 'projectId') ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and (select public.can_access_project(
          organization_id, (metadata ->> 'projectId')::uuid
        ))
      )
    )
  );

-- Project assignments are visible to project members and organization admins.
drop policy if exists project_memberships_member_select
  on public.project_memberships;
create policy project_memberships_project_select
  on public.project_memberships for select to authenticated using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (select public.can_access_project(organization_id, project_id))
  );

-- Tighten project mutation roles.
drop policy if exists projects_admin_update on public.projects;
create policy projects_role_update on public.projects for update to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (select public.current_project_role(organization_id, id))
      in ('owner', 'manager')
  )
  with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (select public.current_project_role(organization_id, id))
      in ('owner', 'manager')
  );

drop policy if exists risks_manager_insert on public.risks;
drop policy if exists risks_manager_update on public.risks;
drop policy if exists risks_manager_delete on public.risks;
create policy risks_project_manage_insert on public.risks for insert to authenticated
  with check (
    project_id is not null
    and (
      (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
      or (
        (select public.current_organization_role(organization_id)) = 'manager'
        and (select public.current_project_role(organization_id, project_id))
          in ('owner', 'manager')
      )
    )
  );
create policy risks_project_manage_update on public.risks for update to authenticated
  using (
    project_id is not null
    and (
      (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
      or (
        (select public.current_organization_role(organization_id)) = 'manager'
        and (select public.current_project_role(organization_id, project_id))
          in ('owner', 'manager')
      )
    )
  ) with check (
    project_id is not null
    and (
      (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
      or (
        (select public.current_organization_role(organization_id)) = 'manager'
        and (select public.current_project_role(organization_id, project_id))
          in ('owner', 'manager')
      )
    )
  );
create policy risks_project_manage_delete on public.risks for delete to authenticated
  using (
    project_id is not null and (
      (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
      or (
        (select public.current_organization_role(organization_id)) = 'manager'
        and (select public.current_project_role(organization_id, project_id))
          in ('owner', 'manager')
      )
    )
  );

drop policy if exists recommended_actions_role_update
  on public.recommended_actions;
create policy recommended_actions_project_update
  on public.recommended_actions for update to authenticated using (
    exists (
      select 1 from public.risks risk
      where risk.id = risk_id
        and risk.organization_id = organization_id
        and risk.project_id is not null
        and (
          (select public.current_organization_role(organization_id))
            in ('owner', 'administrator')
          or (
            (select public.current_organization_role(organization_id)) = 'manager'
            and (select public.current_project_role(
              organization_id, risk.project_id
            )) in ('owner', 'manager')
          )
          or (
            (select public.current_organization_role(organization_id)) = 'contributor'
            and (select public.current_project_role(
              organization_id, risk.project_id
            )) in ('owner', 'manager', 'contributor')
          )
        )
    )
  ) with check (
    exists (
      select 1 from public.risks risk
      where risk.id = risk_id
        and risk.organization_id = organization_id
        and risk.project_id is not null
        and (
          (select public.current_organization_role(organization_id))
            in ('owner', 'administrator')
          or (
            (select public.current_organization_role(organization_id)) = 'manager'
            and (select public.current_project_role(
              organization_id, risk.project_id
            )) in ('owner', 'manager')
          )
          or (
            (select public.current_organization_role(organization_id)) = 'contributor'
            and (select public.current_project_role(
              organization_id, risk.project_id
            )) in ('owner', 'manager', 'contributor')
          )
        )
    )
  );

drop policy if exists documents_role_insert on public.documents;
drop policy if exists documents_manager_update on public.documents;
drop policy if exists documents_manager_delete on public.documents;
create policy documents_project_insert on public.documents for insert to authenticated
  with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (
      project_id is not null
      and (select public.current_organization_role(organization_id))
        in ('manager', 'contributor')
      and (select public.current_project_role(organization_id, project_id))
        in ('owner', 'manager', 'contributor')
    )
  );
create policy documents_project_update on public.documents for update to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (
      project_id is not null
      and (select public.current_organization_role(organization_id)) = 'manager'
      and (select public.current_project_role(organization_id, project_id))
        in ('owner', 'manager')
    )
  ) with check (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (
      project_id is not null
      and (select public.current_organization_role(organization_id)) = 'manager'
      and (select public.current_project_role(organization_id, project_id))
        in ('owner', 'manager')
    )
  );
create policy documents_project_delete on public.documents for delete to authenticated
  using (
    (select public.current_organization_role(organization_id))
      in ('owner', 'administrator')
    or (
      project_id is not null
      and (select public.current_organization_role(organization_id)) = 'manager'
      and (select public.current_project_role(organization_id, project_id))
        in ('owner', 'manager')
    )
  );

-- Derived risk resources inherit the parent risk's accessible project.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'risk_evidence', 'risk_activities', 'risk_resolutions',
    'risk_email_drafts', 'risk_conversations'
  ] loop
    execute format('drop policy if exists %I on public.%I',
      table_name || '_member_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (
        exists (
          select 1 from public.risks risk
          where risk.id = risk_id
            and risk.organization_id = organization_id
            and risk.project_id is not null
            and (select public.can_access_project(organization_id, risk.project_id))
        )
      )',
      table_name || '_project_select', table_name
    );
  end loop;
end;
$$;

drop policy if exists risk_conversation_messages_member_select
  on public.risk_conversation_messages;
create policy risk_conversation_messages_project_select
  on public.risk_conversation_messages for select to authenticated using (
    exists (
      select 1
      from public.risk_conversations conversation
      join public.risks risk
        on risk.id = conversation.risk_id
       and risk.organization_id = conversation.organization_id
      where conversation.id = risk_conversation_messages.conversation_id
        and conversation.organization_id =
          risk_conversation_messages.organization_id
        and risk.project_id is not null
        and (select public.can_access_project(
          risk_conversation_messages.organization_id, risk.project_id
        ))
    )
  );

drop policy if exists risk_answer_feedback_member_select
  on public.risk_answer_feedback;
create policy risk_answer_feedback_project_select
  on public.risk_answer_feedback for select to authenticated using (
    exists (
      select 1
      from public.risk_conversation_messages message
      join public.risk_conversations conversation
        on conversation.id = message.conversation_id
       and conversation.organization_id = message.organization_id
      join public.risks risk
        on risk.id = conversation.risk_id
       and risk.organization_id = conversation.organization_id
      where message.id = risk_answer_feedback.message_id
        and message.organization_id = risk_answer_feedback.organization_id
        and risk.project_id is not null
        and (select public.can_access_project(
          risk_answer_feedback.organization_id, risk.project_id
        ))
    )
  );

drop policy if exists document_activities_member_select
  on public.document_activities;
create policy document_activities_project_select
  on public.document_activities for select to authenticated using (
    exists (
      select 1 from public.documents document
      where document.id = document_activities.document_id
        and document.organization_id = document_activities.organization_id
        and (
          (
            document.project_id is not null
            and (select public.can_access_project(
              document_activities.organization_id, document.project_id
            ))
          )
          or (
            document.project_id is null
            and (select public.current_organization_role(
              document_activities.organization_id
            ))
              in ('owner', 'administrator')
          )
        )
    )
  );

drop policy if exists ai_analysis_runs_member_select
  on public.ai_analysis_runs;
create policy ai_analysis_runs_project_select
  on public.ai_analysis_runs for select to authenticated using (
    (
      project_id is not null
      and (select public.can_access_project(organization_id, project_id))
      and (select public.current_organization_role(organization_id))
        in ('owner', 'administrator', 'manager')
    )
    or (
      project_id is null
      and (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
    )
  );

drop policy if exists ai_risk_suggestions_member_select
  on public.ai_risk_suggestions;
create policy ai_risk_suggestions_project_select
  on public.ai_risk_suggestions for select to authenticated using (
    (
      project_id is not null
      and (select public.can_access_project(organization_id, project_id))
      and (select public.current_organization_role(organization_id))
        in ('owner', 'administrator', 'manager')
    )
    or (
      project_id is null
      and (select public.current_organization_role(organization_id))
        in ('owner', 'administrator')
    )
  );
