import { z } from "zod";

export const projectRoleSchema = z.enum([
  "owner",
  "manager",
  "contributor",
  "viewer",
]);

export const projectAssignmentSchema = z.object({
  projectId: z.uuid(),
  membershipIds: z.array(z.uuid()).min(1).max(500),
  role: projectRoleSchema,
});

export const projectRemovalSchema = z.object({
  projectId: z.uuid(),
  membershipIds: z.array(z.uuid()).min(1).max(500),
});

export const projectInvitationSchema = z.object({
  projectId: z.uuid(),
  email: z.email().trim().toLowerCase(),
  role: projectRoleSchema,
});

export const projectInvitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
