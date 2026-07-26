-- Supabase may apply default table privileges to newly created public tables.
-- Platform audit data is service-role-only and must never be directly available
-- to customer sessions, even though RLS is also enabled with no client policies.

revoke all on table public.platform_operators,
  public.platform_operator_permissions,
  public.platform_audit_logs
from anon, authenticated;

grant select on table public.platform_operators,
  public.platform_operator_permissions
to authenticated;
grant all on table public.platform_audit_logs to service_role;
