begin;
select plan(18);

select has_table('public', 'notifications', 'notifications exist');
select has_column('public', 'notifications', 'read_at', 'notifications have read state');
select has_table('public', 'collaboration_comments', 'comments exist');
select has_table('public', 'comment_revisions', 'comment revisions exist');
select has_table('public', 'comment_mentions', 'mention references exist');
select has_table('public', 'comment_reactions', 'comment reactions exist');
select has_table('public', 'assignment_history', 'assignment history exists');
select has_table('public', 'resource_presence', 'presence exists');

select is(
  (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  true, 'notifications use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.collaboration_comments'::regclass),
  true, 'comments use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.comment_revisions'::regclass),
  true, 'revisions use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.comment_mentions'::regclass),
  true, 'mentions use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.comment_reactions'::regclass),
  true, 'reactions use RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.assignment_history'::regclass),
  true, 'assignment history uses RLS'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.resource_presence'::regclass),
  true, 'presence uses RLS'
);

select has_index(
  'public', 'notifications', 'notifications_unread_recipient_idx',
  'unread inbox lookup is indexed'
);
select has_index(
  'public', 'collaboration_comments', 'collaboration_comments_subject_idx',
  'comment subject lookup is indexed'
);
select has_index(
  'public', 'resource_presence', 'resource_presence_resource_idx',
  'presence lookup is indexed'
);

select * from finish();
rollback;
