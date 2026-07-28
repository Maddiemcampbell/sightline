import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PlatformOperatorRepository } from "./repository";
import type { PlatformOperator } from "./types";
import type {
  CreateOperatorInput,
  UpdateOperatorInput,
} from "./operator-validation";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

type ManagedOperator = Awaited<
  ReturnType<PlatformOperatorRepository["list"]>
>[number];

export class PlatformOperatorService {
  private readonly repository: PlatformOperatorRepository;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.repository = new PlatformOperatorRepository(client);
  }

  list() {
    return this.repository.list();
  }

  async create(input: CreateOperatorInput, actor: PlatformOperator) {
    const authUserId = await this.findOrInviteAuthUser(
      input.email,
      input.displayName,
    );
    return this.repository.create({
      authUserId,
      email: input.email,
      displayName: input.displayName,
      mfaRequired: input.mfaRequired,
      permissions: input.permissions,
      grantedByOperatorId: actor.id,
    });
  }

  async update(input: UpdateOperatorInput, actor: PlatformOperator) {
    const operators = await this.repository.list();
    assertOperatorUpdateAllowed(input, actor, operators);
    await this.repository.update({
      ...input,
      grantedByOperatorId: actor.id,
    });
  }

  private async findOrInviteAuthUser(email: string, displayName: string) {
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await this.client.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (error) throw new Error(error.message);
      const existing = data.users.find(
        (user) => user.email?.toLowerCase() === email,
      );
      if (existing) return existing.id;
      if (data.users.length < 100) break;
    }
    const { data, error } = await this.client.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: displayName, account_type: "platform_operator" } },
    );
    if (error || !data.user)
      throw new Error(error?.message ?? "The operator invitation failed.");
    return data.user.id;
  }
}

export function assertOperatorUpdateAllowed(
  input: UpdateOperatorInput,
  actor: Pick<PlatformOperator, "id">,
  operators: readonly ManagedOperator[],
) {
  if (input.id === actor.id && input.status === "suspended")
    throw new Error("You cannot suspend your own operator account.");
  if (
    input.id === actor.id &&
    !input.permissions.includes("platform.admin.manage")
  )
    throw new Error(
      "You cannot remove your own platform-administration permission.",
    );
  const target = operators.find((operator) => operator.id === input.id);
  if (!target) throw new Error("Platform operator was not found.");
  const removingActiveAdministrator =
    target.status === "active" &&
    target.permissions.includes("platform.admin.manage") &&
    (input.status === "suspended" ||
      !input.permissions.includes("platform.admin.manage"));
  if (
    removingActiveAdministrator &&
    !operators.some(
      (operator) =>
        operator.id !== input.id &&
        operator.status === "active" &&
        operator.permissions.includes("platform.admin.manage"),
    )
  )
    throw new Error("At least one active platform administrator is required.");
}
