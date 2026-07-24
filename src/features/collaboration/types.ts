export type Collaborator = Readonly<{
  membershipId: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}>;

export type CommentReaction = "like" | "celebrate" | "eyes" | "resolved";

export type CollaborationComment = Readonly<{
  id: string;
  bodyMarkdown: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author: Collaborator;
  mentions: readonly Collaborator[];
  reactions: Readonly<Record<CommentReaction, number>>;
  reactedByMe: readonly CommentReaction[];
  canEdit: boolean;
  canDelete: boolean;
}>;
