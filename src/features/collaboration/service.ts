import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { NotificationRepository } from "@/features/notifications/repository";
import { NotificationService } from "@/features/notifications/service";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import {
  extractMentionUsernames,
  usernameFor,
} from "@/features/collaboration/validation";

export class CollaborationService {
  private readonly notifications: NotificationService;

  constructor(private readonly client: SupabaseClient<AppDatabase>) {
    this.notifications = new NotificationService(
      new NotificationRepository(client),
    );
  }

  async createRiskComment(input: {
    context: ActorContext;
    actorMembershipId: string;
    riskId: string;
    projectId: string;
    bodyMarkdown: string;
  }) {
    const mentions = await this.resolveMentions(
      input.context.organizationId,
      input.bodyMarkdown,
    );
    const { data, error } = await this.client
      .from("collaboration_comments")
      .insert({
        organization_id: input.context.organizationId,
        project_id: input.projectId,
        subject_type: "risk",
        subject_id: input.riskId,
        author_membership_id: input.actorMembershipId,
        body_markdown: input.bodyMarkdown,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (mentions.length) {
      const { error: mentionError } = await this.client
        .from("comment_mentions")
        .insert(
          mentions.map((mention) => ({
            organization_id: input.context.organizationId,
            comment_id: data.id,
            mentioned_membership_id: mention.membershipId,
          })),
        );
      if (mentionError) throw new Error(mentionError.message);
      await Promise.all(
        mentions.map((mention) =>
          this.notifications.notify({
            organizationId: input.context.organizationId,
            recipientMembershipId: mention.membershipId,
            actorMembershipId: input.actorMembershipId,
            type: "mention",
            title: "You were mentioned",
            body: input.bodyMarkdown.slice(0, 180),
            href: `/risks/${input.riskId}?tab=activity`,
          }),
        ),
      );
    }
    return { id: data.id, mentionedUserIds: mentions.map((item) => item.userId) };
  }

  async editComment(input: {
    context: ActorContext;
    actorMembershipId: string;
    commentId: string;
    bodyMarkdown: string;
  }) {
    const comment = await this.requireComment(input.context, input.commentId);
    if (comment.author_membership_id !== input.actorMembershipId || comment.deleted_at)
      throw new Error("Only the comment author can edit this comment.");
    const mentions = await this.resolveMentions(
      input.context.organizationId,
      input.bodyMarkdown,
    );
    const { error: revisionError } = await this.client
      .from("comment_revisions")
      .insert({
        organization_id: input.context.organizationId,
        comment_id: comment.id,
        body_markdown: comment.body_markdown,
        edited_by_membership_id: input.actorMembershipId,
      });
    if (revisionError) throw new Error(revisionError.message);
    const { error } = await this.client
      .from("collaboration_comments")
      .update({
        body_markdown: input.bodyMarkdown,
        edited_at: new Date().toISOString(),
      })
      .eq("organization_id", input.context.organizationId)
      .eq("id", comment.id);
    if (error) throw new Error(error.message);
    await this.client
      .from("comment_mentions")
      .delete()
      .eq("organization_id", input.context.organizationId)
      .eq("comment_id", comment.id);
    if (mentions.length)
      await this.client.from("comment_mentions").insert(
        mentions.map((mention) => ({
          organization_id: input.context.organizationId,
          comment_id: comment.id,
          mentioned_membership_id: mention.membershipId,
        })),
      );
  }

  async deleteComment(
    context: ActorContext,
    actorMembershipId: string,
    commentId: string,
  ) {
    const comment = await this.requireComment(context, commentId);
    const permitted =
      comment.author_membership_id === actorMembershipId ||
      context.organizationRole === "owner" ||
      context.organizationRole === "administrator";
    if (!permitted) throw new Error("You cannot delete this comment.");
    const { error } = await this.client
      .from("collaboration_comments")
      .update({
        body_markdown: "[deleted]",
        deleted_at: new Date().toISOString(),
        deleted_by_membership_id: actorMembershipId,
      })
      .eq("organization_id", context.organizationId)
      .eq("id", comment.id);
    if (error) throw new Error(error.message);
  }

  async toggleReaction(input: {
    context: ActorContext;
    membershipId: string;
    commentId: string;
    reaction: "like" | "celebrate" | "eyes" | "resolved";
  }) {
    await this.requireComment(input.context, input.commentId);
    const key = {
      organization_id: input.context.organizationId,
      comment_id: input.commentId,
      membership_id: input.membershipId,
      reaction: input.reaction,
    };
    const { data, error } = await this.client
      .from("comment_reactions")
      .select("comment_id")
      .match(key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const result = data
      ? await this.client.from("comment_reactions").delete().match(key)
      : await this.client.from("comment_reactions").insert(key);
    if (result.error) throw new Error(result.error.message);
  }

  private async requireComment(context: ActorContext, commentId: string) {
    const { data, error } = await this.client
      .from("collaboration_comments")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", commentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Comment not found.");
    return data;
  }

  private async resolveMentions(organizationId: string, markdown: string) {
    const usernames = extractMentionUsernames(markdown);
    if (!usernames.length) return [];
    const [{ data: memberships, error }, { data: users, error: userError }] =
      await Promise.all([
        this.client
          .from("organization_memberships")
          .select("id,application_user_id")
          .eq("organization_id", organizationId),
        this.client
          .from("users")
          .select("id,full_name,email")
          .eq("organization_id", organizationId),
      ]);
    if (error || userError) throw new Error((error ?? userError)!.message);
    const membershipByUser = new Map(
      memberships.map((membership) => [membership.application_user_id, membership]),
    );
    return users.flatMap((user) => {
      const membership = membershipByUser.get(user.id);
      return membership &&
        usernames.includes(usernameFor(user.full_name, user.email))
        ? [{ membershipId: membership.id, userId: user.id }]
        : [];
    });
  }
}
