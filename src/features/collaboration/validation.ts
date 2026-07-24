import { z } from "zod";

export const commentInputSchema = z.object({
  riskId: z.uuid(),
  bodyMarkdown: z.string().trim().min(1).max(10_000),
});

export const editCommentSchema = z.object({
  commentId: z.uuid(),
  riskId: z.uuid(),
  bodyMarkdown: z.string().trim().min(1).max(10_000),
});

export const commentIdSchema = z.object({
  commentId: z.uuid(),
  riskId: z.uuid(),
});

export const reactionSchema = commentIdSchema.extend({
  reaction: z.enum(["like", "celebrate", "eyes", "resolved"]),
});

export function usernameFor(name: string, email: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return base || email.split("@")[0]!.toLowerCase();
}

export function extractMentionUsernames(markdown: string) {
  return [
    ...new Set(
      [...markdown.matchAll(/(^|[^\w])@([a-z0-9][a-z0-9._-]{0,63})/gi)].map(
        (match) => match[2]!.toLowerCase().replace(/[._-]+$/, ""),
      ),
    ),
  ];
}
