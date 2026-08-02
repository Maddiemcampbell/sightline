import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { CustomerProvisioningRepository } from "@/features/customer-provisioning/repository";
import { CustomerProvisioningService } from "@/features/customer-provisioning/service";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { CustomerOwnerActivationForm } from "./activation-form";

export const dynamic = "force-dynamic";

export default async function CustomerActivationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await new CustomerProvisioningService(
    new CustomerProvisioningRepository(createAdminSupabaseClient()),
  ).previewActivation(token);
  if (!preview) notFound();
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <Card>
        <p className="text-deep-green text-sm font-semibold">
          Approved organization
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Set up {preview.companyName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This private invitation is for {preview.ownerEmail}. Completing it
          creates the organization and its first Owner account.
        </p>
        <CustomerOwnerActivationForm token={token} />
      </Card>
    </div>
  );
}
