import { Card } from "@/components/ui/card";
import { updateOrganizationSettingsAction } from "@/app/settings/admin-actions";
import {
  Field,
  SelectField,
  SettingsForm,
} from "@/features/settings/settings-forms";
import { canManageOrganization } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function OrganizationAdminPage() {
  const context = await requireActorContext();
  const { data, error } = await createAdminSupabaseClient()
    .from("organizations")
    .select("*")
    .eq("id", context.organizationId)
    .single();
  if (error) throw new Error(error.message);
  const canManage = canManageOrganization(context);
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Organization profile</h2>
        <p className="text-muted mt-2 mb-6 text-sm">
          {canManage
            ? "These values shape organization-wide presentation and reporting."
            : "Only Owners and Administrators can change these values."}
        </p>
        {canManage ? (
          <SettingsForm action={updateOrganizationSettingsAction}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Organization name"
                name="name"
                defaultValue={data.name}
                required
              />
              <Field
                label="Logo URL"
                name="logoUrl"
                defaultValue={data.logo_url ?? ""}
                type="url"
                help="HTTPS image URL. Managed uploads are planned."
              />
              <Field
                label="Brand color"
                name="brandColor"
                defaultValue={data.brand_color}
                type="color"
              />
              <Field
                label="Timezone"
                name="timezone"
                defaultValue={data.timezone}
                required
              />
              <SelectField
                label="Default currency"
                name="defaultCurrency"
                defaultValue={data.default_currency}
                options={[
                  ["USD", "USD — US Dollar"],
                  ["CAD", "CAD — Canadian Dollar"],
                  ["EUR", "EUR — Euro"],
                  ["GBP", "GBP — Pound Sterling"],
                ]}
              />
              <Field
                label="Industry"
                name="industry"
                defaultValue={data.industry ?? ""}
              />
              <SelectField
                label="Company size"
                name="companySize"
                defaultValue={data.company_size ?? ""}
                options={[
                  ["", "Not specified"],
                  ["1-10", "1–10"],
                  ["11-50", "11–50"],
                  ["51-200", "51–200"],
                  ["201-500", "201–500"],
                  ["501-1000", "501–1,000"],
                  ["1001+", "1,001+"],
                ]}
              />
            </div>
          </SettingsForm>
        ) : (
          <p className="text-muted text-sm">You have read-only access.</p>
        )}
      </Card>
    </div>
  );
}
