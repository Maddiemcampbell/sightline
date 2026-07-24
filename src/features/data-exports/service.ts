import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertAuthorized,
  canExportOrganizationData,
  type ActorContext,
} from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import { DataExportRepository } from "@/features/data-exports/repository";
import { dataExportRequestSchema } from "@/features/data-exports/validation";

export class DataExportService {
  constructor(
    private readonly client: SupabaseClient<AppDatabase>,
    private readonly repository = new DataExportRepository(client),
  ) {}

  async request(context: ActorContext, input: unknown) {
    assertAuthorized(canExportOrganizationData(context));
    const { format } = dataExportRequestSchema.parse(input);
    if ((await this.repository.countActive(context.organizationId)) >= 3)
      throw new Error("Wait for an existing export to finish before requesting another.");
    const [{ data: membership, error: membershipError }, { data: user, error: userError }] =
      await Promise.all([
        this.client
          .from("organization_memberships")
          .select("id")
          .eq("organization_id", context.organizationId)
          .eq("auth_user_id", context.authUserId)
          .single(),
        this.client
          .from("users")
          .select("full_name,email")
          .eq("organization_id", context.organizationId)
          .eq("id", context.userId)
          .single(),
      ]);
    if (membershipError) throw new Error(membershipError.message);
    if (userError) throw new Error(userError.message);
    return this.repository.create({
      organization_id: context.organizationId,
      requested_by_membership_id: membership.id,
      requested_by_auth_user_id: context.authUserId,
      requested_by_name: user.full_name,
      requested_by_email: user.email,
      export_format: format,
    });
  }
}

