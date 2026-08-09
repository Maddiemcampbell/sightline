import { NextResponse } from "next/server";

import { canManageIntegrations } from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createMicrosoftConsentUrl } from "@/features/microsoft365/consent";
import { rejectCrossSiteMutation } from "@/lib/security/request";

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const context = await requireActorContext();
  if (!canManageIntegrations(context)) {
    return NextResponse.json(
      { error: "Manager access required." },
      { status: 403 },
    );
  }
  const url = await createMicrosoftConsentUrl({
    organizationId: context.organizationId,
    userId: context.userId,
  });
  return NextResponse.redirect(url, 303);
}
