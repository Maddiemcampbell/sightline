import { Card } from "@/components/ui/card";
import { updateProjectDefaultsAction } from "@/app/settings/admin-actions";
import { SelectField, SettingsForm } from "@/features/settings/settings-forms";
import { canManageOrganization } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function ProjectSettingsPage() {
  const context = await requireActorContext();
  const { data, error } = await createAdminSupabaseClient().from("organizations").select("*").eq("id", context.organizationId).single();
  if (error) throw new Error(error.message);
  return <Card><h2 className="text-xl font-semibold">Project defaults</h2><p className="text-muted mt-2 mb-6 text-sm">Defaults apply to future projects. Existing access assignments remain unchanged.</p>{canManageOrganization(context) ? <SettingsForm action={updateProjectDefaultsAction}><SelectField label="Default project visibility" name="visibility" defaultValue={data.default_project_visibility} options={[["private","Assigned members only"],["organization","Entire organization"]]} /><SelectField label="Default project role" name="role" defaultValue={data.default_project_role} options={[["manager","Manager"],["contributor","Contributor"],["viewer","Viewer"]]} /><SelectField label="Default document permissions" name="documentPermissions" defaultValue={data.default_document_permissions} options={[["project_members","All project members"],["managers","Project managers only"],["organization","Entire organization"]]} /></SettingsForm> : <p className="text-muted text-sm">Only Owners and Administrators can change project defaults.</p>}</Card>;
}
