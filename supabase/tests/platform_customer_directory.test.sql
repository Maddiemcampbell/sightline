begin;
select plan(8);

select has_view(
  'public', 'platform_organization_directory',
  'service-only organization directory view exists'
);
select has_view(
  'public', 'platform_user_directory',
  'service-only user directory view exists'
);
select has_index(
  'public', 'organizations', 'organizations_name_trgm_idx',
  'organization name search is indexed'
);
select has_index(
  'public', 'users', 'users_full_name_trgm_idx',
  'user name search is indexed'
);
select has_index(
  'public', 'users', 'users_email_trgm_idx',
  'user email search is indexed'
);
select table_privs_are(
  'public', 'platform_organization_directory', 'authenticated',
  array[]::text[],
  'customer sessions cannot query the organization directory'
);
select table_privs_are(
  'public', 'platform_user_directory', 'authenticated',
  array[]::text[],
  'customer sessions cannot query the user directory'
);
select ok(
  has_table_privilege(
    'service_role',
    'public.platform_user_directory',
    'SELECT'
  ),
  'trusted staff services can query the user directory'
);

select * from finish();
rollback;
