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

  async list() {
    const [{ data: operators, error }, { data: grants, error: grantsError }] =
      await Promise.all([
        this.client
          .from("platform_operators")
          .select("*")
          .order("created_at", { ascending: true }),
        this.client
          .from("platform_operator_permissions")
          .select("operator_id,permission"),
      ]);
    if (error) throw new Error(error.message);
    if (grantsError) throw new Error(grantsError.message);
    return (operators ?? []).map((operator) => ({
      id: operator.id,
      authUserId: operator.auth_user_id,
      email: operator.email,
      displayName: operator.display_name,
      status: operator.status,
      mfaRequired: operator.mfa_required,
      lastLoginAt: operator.last_login_at,
      createdAt: operator.created_at,
      permissions: (grants ?? [])
        .filter((grant) => grant.operator_id === operator.id)
        .map((grant) => grant.permission as PlatformPermission),
    }));
  }

  async create(input: {
    authUserId: string;
    email: string;
    displayName: string;
    mfaRequired: boolean;
    permissions: readonly PlatformPermission[];
    grantedByOperatorId: string;
  }) {
    const { data, error } = await this.client
      .from("platform_operators")
      .insert({
        auth_user_id: input.authUserId,
        email: input.email,
        display_name: input.displayName,
        mfa_required: input.mfaRequired,
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: grantError } = await this.client
      .from("platform_operator_permissions")
      .insert(
        input.permissions.map((permission) => ({
          operator_id: data.id,
          permission,
          granted_by_operator_id: input.grantedByOperatorId,
        })),
      );
    if (grantError) {
      await this.client.from("platform_operators").delete().eq("id", data.id);
      throw new Error(grantError.message);
    }
    return data.id;
  }

  async update(input: {
    id: string;
    displayName: string;
    status: "active" | "suspended";
    mfaRequired: boolean;
    permissions: readonly PlatformPermission[];
    grantedByOperatorId: string;
  }) {
    const { error } = await this.client
      .from("platform_operators")
      .update({
        display_name: input.displayName,
        status: input.status,
        mfa_required: input.mfaRequired,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    const { error: deleteError } = await this.client
      .from("platform_operator_permissions")
      .delete()
      .eq("operator_id", input.id);
    if (deleteError) throw new Error(deleteError.message);
    const { error: grantError } = await this.client
      .from("platform_operator_permissions")
      .insert(
        input.permissions.map((permission) => ({
          operator_id: input.id,
          permission,
          granted_by_operator_id: input.grantedByOperatorId,
        })),
      );
    if (grantError) throw new Error(grantError.message);
  }
}
