import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type {
  CollaborationComment,
  Collaborator,
  CommentReaction,
} from "@/features/collaboration/types";
import { usernameFor } from "@/features/collaboration/validation";

export class CollaborationRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async listCollaborators(organizationId: string): Promise<Collaborator[]> {
    const [{ data: memberships, error }, { data: users, error: userError }] =
      await Promise.all([
        this.client
          .from("organization_memberships")
          .select("*")
          .eq("organization_id", organizationId),
        this.client
          .from("users")
          .select("id,full_name,email")
          .eq("organization_id", organizationId),
      ]);
    if (error || userError) throw new Error((error ?? userError)!.message);
    const userById = new Map(users.map((user) => [user.id, user]));
    return memberships.flatMap((membership) => {
      const user = userById.get(membership.application_user_id);
      return user
        ? [{
            membershipId: membership.id,
            userId: user.id,
            name: user.full_name,
            username: usernameFor(user.full_name, user.email),
            avatarUrl: membership.avatar_url,
          }]
        : [];
    });
  }

  async listRiskComments(
    context: ActorContext,
    membershipId: string,
    riskId: string,
  ): Promise<CollaborationComment[]> {
    const { data: comments, error } = await this.client
      .from("collaboration_comments")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("subject_type", "risk")
      .eq("subject_id", riskId)
      .order("created_at");
    if (error) throw new Error(error.message);
    if (!comments.length) return [];
    const ids = comments.map((comment) => comment.id);
    const [collaborators, mentions, reactions] = await Promise.all([
      this.listCollaborators(context.organizationId),
      this.client
        .from("comment_mentions")
        .select("*")
        .eq("organization_id", context.organizationId)
        .in("comment_id", ids),
      this.client
        .from("comment_reactions")
        .select("*")
        .eq("organization_id", context.organizationId)
        .in("comment_id", ids),
    ]);
    if (mentions.error || reactions.error)
      throw new Error((mentions.error ?? reactions.error)!.message);
    const collaboratorByMembership = new Map(
      collaborators.map((person) => [person.membershipId, person]),
    );
    return comments.flatMap((comment) => {
      const author = collaboratorByMembership.get(comment.author_membership_id);
      if (!author) return [];
      const commentReactions = reactions.data.filter(
        (reaction) => reaction.comment_id === comment.id,
      );
      const counts: Record<CommentReaction, number> = {
        like: 0,
        celebrate: 0,
        eyes: 0,
        resolved: 0,
      };
      for (const reaction of commentReactions) counts[reaction.reaction] += 1;
      return [{
        id: comment.id,
        bodyMarkdown: comment.body_markdown,
        createdAt: comment.created_at,
        editedAt: comment.edited_at,
        deletedAt: comment.deleted_at,
        author,
        mentions: mentions.data
          .filter((mention) => mention.comment_id === comment.id)
          .flatMap((mention) =>
            collaboratorByMembership.get(mention.mentioned_membership_id) ?? [],
          ),
        reactions: counts,
        reactedByMe: commentReactions
          .filter((reaction) => reaction.membership_id === membershipId)
          .map((reaction) => reaction.reaction),
        canEdit: comment.author_membership_id === membershipId && !comment.deleted_at,
        canDelete:
          !comment.deleted_at &&
          (comment.author_membership_id === membershipId ||
            context.organizationRole === "owner" ||
            context.organizationRole === "administrator"),
      }];
    });
  }
}
