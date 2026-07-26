import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PlatformOperator,
  PlatformPermission,
} from "@/features/platform-admin/types";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class PlatformOperatorRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async findActiveByAuthUserId(
    authUserId: string,
  ): Promise<PlatformOperator | null> {
    const { data: operator, error } = await this.client
      .from("platform_operators")
      .select("*")
      .eq("auth_user_id", authUserId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!operator) return null;
    const { data: grants, error: grantsError } = await this.client
      .from("platform_operator_permissions")
      .select("permission")
      .eq("operator_id", operator.id);
    if (grantsError) throw new Error(grantsError.message);
    return {
      id: operator.id,
      authUserId: operator.auth_user_id,
      email: operator.email,
      displayName: operator.display_name,
      status: operator.status,
      mfaRequired: operator.mfa_required,
      lastLoginAt: operator.last_login_at,
      permissions: new Set(
        (grants ?? []).map((grant) => grant.permission as PlatformPermission),
      ),
    };
  }
}
