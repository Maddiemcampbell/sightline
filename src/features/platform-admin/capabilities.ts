import type {
  PlatformOperator,
  PlatformPermission,
} from "@/features/platform-admin/types";

export function platformCan(
  operator: Pick<PlatformOperator, "status" | "permissions"> | null,
  permission: PlatformPermission,
) {
  return operator?.status === "active" && operator.permissions.has(permission);
}
