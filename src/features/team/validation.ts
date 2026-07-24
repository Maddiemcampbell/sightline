import { z } from "zod";

export const organizationRoleSchema = z.enum([
  "owner",
  "administrator",
  "manager",
  "contributor",
]);

export const invitationRoleSchema = z.enum([
  "administrator",
  "manager",
  "contributor",
]);

export const inviteTeamMemberSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  role: invitationRoleSchema,
});

export const membershipMutationSchema = z.object({
  membershipId: z.uuid(),
});

export const invitationMutationSchema = z.object({
  invitationId: z.uuid(),
});

export const changeRoleSchema = membershipMutationSchema.extend({
  role: organizationRoleSchema,
  confirmed: z.literal("yes").optional(),
});

export const assignProjectsSchema = membershipMutationSchema.extend({
  projectIds: z.array(z.uuid()).max(500),
});

export const teamQuerySchema = z.object({
  q: z.string().trim().max(120).catch(""),
  role: z
    .enum(["all", "owner", "administrator", "manager", "contributor"])
    .catch("all"),
  sort: z.enum(["name", "last_active", "invitation_status"]).catch("name"),
});
