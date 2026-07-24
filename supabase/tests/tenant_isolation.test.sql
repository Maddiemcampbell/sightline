begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'f1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'owner-a@example.com', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'owner-b@example.com', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

insert into public.organizations (id, name, slug)
values
  ('f2000000-0000-4000-8000-000000000001', 'Tenant A', 'tenant-a-isolation'),
  ('f2000000-0000-4000-8000-000000000002', 'Tenant B', 'tenant-b-isolation');

insert into public.users (
  id, organization_id, auth_user_id, email, full_name, role
)
values
  (
    'f3000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000001',
    'owner-a@example.com', 'Owner A', 'admin'
  ),
  (
    'f3000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000002',
    'owner-b@example.com', 'Owner B', 'admin'
  );

insert into public.organization_memberships (
  id, organization_id, auth_user_id, application_user_id
)
values
  (
    'f4000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000001',
    'f3000000-0000-4000-8000-000000000001'
  ),
  (
    'f4000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000002',
    'f3000000-0000-4000-8000-000000000002'
  );

insert into public.projects (
  id, organization_id, name, project_number, status
)
values
  (
    'f5000000-0000-4000-8000-000000000001',
    'f2000000-0000-4000-8000-000000000001',
    'Project A', 'A-001', 'active'
  ),
  (
    'f5000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000002',
    'Project B', 'B-001', 'active'
  );

insert into storage.objects (bucket_id, name, owner_id)
values
  (
    'source-documents',
    'f2000000-0000-4000-8000-000000000001/document-a/a.pdf',
    'f1000000-0000-4000-8000-000000000001'
  ),
  (
    'source-documents',
    'f2000000-0000-4000-8000-000000000002/document-b/b.pdf',
    'f1000000-0000-4000-8000-000000000002'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner-a@example.com"}',
  true
);

do $$
declare
  visible_projects integer;
  visible_foreign_projects integer;
  visible_files integer;
  visible_foreign_files integer;
begin
  select count(*) into visible_projects
  from public.projects
  where organization_id = 'f2000000-0000-4000-8000-000000000001';
  select count(*) into visible_foreign_projects
  from public.projects
  where organization_id = 'f2000000-0000-4000-8000-000000000002';
  select count(*) into visible_files
  from storage.objects
  where bucket_id = 'source-documents'
    and name like 'f2000000-0000-4000-8000-000000000001/%';
  select count(*) into visible_foreign_files
  from storage.objects
  where bucket_id = 'source-documents'
    and name like 'f2000000-0000-4000-8000-000000000002/%';

  if visible_projects <> 1 or visible_foreign_projects <> 0 then
    raise exception 'SELECT isolation failed';
  end if;
  if visible_files <> 1 or visible_foreign_files <> 0 then
    raise exception 'storage download isolation failed';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.projects (organization_id, name, project_number)
    values (
      'f2000000-0000-4000-8000-000000000002',
      'Cross-tenant insert',
      'B-ILLEGAL'
    );
    raise exception 'cross-tenant INSERT unexpectedly succeeded';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'source-documents',
      'f2000000-0000-4000-8000-000000000002/illegal/file.pdf',
      'f1000000-0000-4000-8000-000000000001'
    );
    raise exception 'cross-tenant upload unexpectedly succeeded';
  exception
    when insufficient_privilege or check_violation then null;
  end;
end;
$$;

do $$
declare
  affected integer;
begin
  update public.projects
  set name = 'Cross-tenant update'
  where id = 'f5000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'UPDATE isolation failed'; end if;

  delete from public.projects
  where id = 'f5000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'DELETE isolation failed'; end if;

  -- Supabase Storage permits deletes through its API by setting this
  -- transaction-local guard before issuing SQL. Reproduce that API behavior
  -- here so the storage RLS policy, rather than the protective trigger, is
  -- what decides whether the foreign object can be deleted.
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects
  where bucket_id = 'source-documents'
    and name = 'f2000000-0000-4000-8000-000000000002/document-b/b.pdf';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'storage delete isolation failed'; end if;
end;
$$;

insert into public.audit_logs (
  organization_id, actor_auth_user_id, actor_user_id,
  event_type, resource_type, resource_id
)
values (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'f3000000-0000-4000-8000-000000000001',
  'project.viewed', 'project',
  'f5000000-0000-4000-8000-000000000001'
);

do $$
begin
  begin
    update public.audit_logs set outcome = 'failed';
    raise exception 'audit UPDATE unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.audit_logs;
    raise exception 'audit DELETE unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select pass('tenant data, storage, and audit isolation policies hold');
select * from finish();

rollback;
