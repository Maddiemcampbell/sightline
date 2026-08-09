import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { consumeMicrosoftConsentState } from "@/features/microsoft365/consent";
import { MicrosoftGraphClient } from "@/features/microsoft365/client";
import { Microsoft365Repository } from "@/features/microsoft365/repository";
import { recordAuditEvent } from "@/features/audit/service";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const tenant = z.uuid().safeParse(request.nextUrl.searchParams.get("tenant"));
  const granted = request.nextUrl.searchParams.get("admin_consent") === "True";
  if (!state || !tenant.success || !granted) {
    return NextResponse.redirect(
      new URL("/integrations/microsoft365?error=consent_denied", request.url),
    );
  }
  const consent = await consumeMicrosoftConsentState(state);
  if (!consent) {
    return NextResponse.redirect(
      new URL("/integrations/microsoft365?error=invalid_state", request.url),
    );
  }
  try {
    const organization = await new MicrosoftGraphClient(
      tenant.data,
    ).organization();
    const connection = await new Microsoft365Repository(
      createAdminSupabaseClient(),
    ).saveConnection({
      organizationId: consent.organization_id,
      tenantId: tenant.data,
      tenantName: organization.displayName,
    });
    await recordAuditEvent({
      organizationId: consent.organization_id,
      actorAuthUserId: null,
      actorUserId: consent.requested_by_user_id,
      action: "integration.microsoft365_connected",
      resourceType: "integration_connection",
      resourceId: connection.id,
      metadata: { provider: "sharepoint", tenantId: tenant.data },
    });
    return NextResponse.redirect(
      new URL("/integrations/microsoft365?connected=true", request.url),
    );
  } catch {
    return NextResponse.redirect(
      new URL(
        "/integrations/microsoft365?error=connection_failed",
        request.url,
      ),
    );
  }
}
