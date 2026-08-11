drop policy exception_alerts_member_select on public.exception_alerts;
create policy exception_alerts_admin_select on public.exception_alerts
for select to authenticated using (
  public.current_organization_role(organization_id) in ('owner', 'administrator')
);
