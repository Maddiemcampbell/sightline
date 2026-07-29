import { Card } from "@/components/ui/card";
import { updateProfileAction } from "@/app/settings/admin-actions";
import { Field, SettingsForm } from "@/features/settings/settings-forms";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function ProfileSettingsPage() {
  const context = await requireActorContext();
  const { data, error } = await createAdminSupabaseClient()
    .from("users")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("id", context.userId)
    .single();
  if (error) throw new Error(error.message);
  return (
    <Card>
      <h2 className="text-xl font-semibold">Your profile</h2>
      <p className="text-muted mt-2 mb-6 text-sm">
        Keep your identity accurate so assignments, comments, and audit events
        are clear.
      </p>
      <SettingsForm action={updateProfileAction}>
        <Field
          label="Full name"
          name="fullName"
          defaultValue={data.full_name}
          required
        />
        <Field label="Job title" name="title" defaultValue={data.title ?? ""} />
      </SettingsForm>
    </Card>
  );
}
