import { updateOrganizationSettingsAction } from "@/app/settings/admin-actions";
import { Card } from "@/components/ui/card";
import {
  Field,
  SelectField,
  SettingsForm,
} from "@/features/settings/settings-forms";

type OrganizationSettings = Readonly<{
  name: string;
  logo_url: string | null;
  brand_color: string;
  timezone: string;
  default_currency: string;
  industry: string | null;
  company_size: string | null;
}>;

export function OrganizationSettingsPanel({
  organization,
  canManage,
}: {
  organization: OrganizationSettings;
  canManage: boolean;
}) {
  return (
    <Card>
      <h2 className="text-xl font-semibold">Organization settings</h2>
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
              defaultValue={organization.name}
              required
            />
            <Field
              label="Logo URL"
              name="logoUrl"
              defaultValue={organization.logo_url ?? ""}
              type="url"
              help="HTTPS image URL. Managed uploads are planned."
            />
            <Field
              label="Brand color"
              name="brandColor"
              defaultValue={organization.brand_color}
              type="color"
            />
            <Field
              label="Timezone"
              name="timezone"
              defaultValue={organization.timezone}
              required
            />
            <SelectField
              label="Default currency"
              name="defaultCurrency"
              defaultValue={organization.default_currency}
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
              defaultValue={organization.industry ?? ""}
            />
            <SelectField
              label="Company size"
              name="companySize"
              defaultValue={organization.company_size ?? ""}
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
  );
}
