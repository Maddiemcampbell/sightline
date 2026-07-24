-- Document objects are never directly accessible to authenticated clients.
-- Verified server endpoints perform application authorization and use the
-- service role only for the final upload, cleanup, or signed-URL operation.
update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'image/jpeg',
    'image/png'
  ]
where id = 'source-documents';

drop policy if exists source_documents_member_select on storage.objects;
drop policy if exists source_documents_member_insert on storage.objects;
drop policy if exists source_documents_member_update on storage.objects;
drop policy if exists source_documents_member_delete on storage.objects;

-- Bind each stored object to both its owning organization and document row.
-- This prevents a privileged write from pointing one document at another
-- document's object inside the same organization.
alter table public.documents
  drop constraint if exists documents_storage_path_organization_check;

alter table public.documents
  add constraint documents_storage_path_document_check
  check (
    storage_path is null
    or storage_path like organization_id::text || '/' || id::text || '/%'
  ) not valid;

alter table public.documents
  validate constraint documents_storage_path_document_check;
