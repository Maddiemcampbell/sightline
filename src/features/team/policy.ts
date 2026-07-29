import type { OrganizationRole } from "@/lib/auth/authorization";

export type TeamActor = Readonly<{
  membershipId: string;
  role: OrganizationRole;
}>;

export type TeamTarget = Readonly<{
  membershipId: string;
  role: OrganizationRole;
}>;

export function canChangeMemberRole(
  actor: TeamActor,
  target: TeamTarget,
  nextRole: OrganizationRole,
): boolean {
  if (actor.role !== "owner" && actor.role !== "administrator") return false;
  if (actor.membershipId === target.membershipId) return false;
  if (target.role === "owner") return false;
  if (nextRole === "owner") return actor.role === "owner";
  if (actor.role === "administrator" && target.role === "administrator")
    return false;
  return true;
}

export function canRemoveMember(actor: TeamActor, target: TeamTarget): boolean {
  if (actor.role !== "owner" && actor.role !== "administrator") return false;
  if (actor.membershipId === target.membershipId) return false;
  if (target.role === "owner") return false;
  return actor.role === "owner" || target.role !== "administrator";
}

export function requiresRoleConfirmation(
  currentRole: OrganizationRole,
  nextRole: OrganizationRole,
): boolean {
  return (
    nextRole === "owner" ||
    (currentRole === "administrator" && nextRole !== "administrator")
  );
}
