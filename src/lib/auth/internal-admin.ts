import "server-only";

import {
  assertAuthorized,
  canAccessInternalAdmin,
  type ActorContext,
} from "@/lib/auth/authorization";
import { isInternalAdminAuthUser } from "@/lib/auth/internal-admin-policy";

export function assertInternalAdmin(context: ActorContext) {
  assertAuthorized(
    canAccessInternalAdmin(
      context,
      isInternalAdminAuthUser(context.authUserId),
    ),
  );
}

