# Sightline collaboration architecture

## Principles

Collaboration records are organization-owned and, when attached to product data,
project-scoped. UI filters are never the security boundary. Reads are protected by
RLS through `can_access_project`; writes flow through authenticated Server Actions,
central authorization, and service-role repositories after resource access is
verified.

Sightline keeps three histories separate:

- Product activity explains meaningful human, system, AI, and integration events.
- Audit records are the internal security ledger.
- Comment revisions and assignment history are append-only collaboration history.

## Comments and mentions

`collaboration_comments` supports project, risk, action, and document subjects.
The first integrated surface is risk activity. Comment bodies store Markdown, not
HTML. Rendering uses React text nodes and a small safe Markdown presentation layer,
so stored content is not injected with `dangerouslySetInnerHTML`.

Typing `@username` provides organization-member autocomplete. On save, usernames
are resolved server-side and stored in `comment_mentions`. A mention creates an
in-app notification unless the author mentions themselves. Previous bodies are
written to `comment_revisions` before edits. Authors may edit or delete their own
comments; organization Owners and Administrators may delete. Deletion is a
tombstone, preserving history and references.

Reactions are unique per comment, member, and supported reaction. Toggling is
idempotent from the user's perspective.

## Assignments

Risk and action owner changes append an `assignment_history` record with the old
assignee, new assignee, actor membership, project, and timestamp. New assignees
receive a notification. Action completion creates an `action_completed`
notification. Existing activity entries remain the human-readable product history.

## Presence

`resource_presence` records the latest authenticated view of a resource. A unique
key makes refreshes an upsert rather than an event stream. “Viewing now” means the
record was touched within five minutes; this is advisory presence, not a locking
mechanism. The current implementation updates risk presence during server render.
Project member `last_active_at` remains the broader “recently active” signal.

## Notifications

The notification inbox supports mention, assignment, role change, invitation,
project added, risk assigned, and action completed. Records contain a local
destination, read timestamp, actor, recipient, and payload. The top navigation
shows unread count, a dropdown, individual mark-read, and mark-all-read with
optimistic feedback. Email and push delivery are intentionally out of scope.

Only the recipient can select or update their notifications through RLS. Creation
is server-only. URLs must be local paths to prevent open redirects.

## Screen conventions

- Avatars accompany people in comments, activity, team, project access, and the
  global user control.
- Risk summaries and action cards continue to expose the active assignee.
- Risk collaboration shows comments, recent viewers, assignment history, and
  actor-classified activity.
- Project access shows ownership, access role, and recently active status.

## Deployment

Apply `20260724070000_v3_collaboration.sql` after the project-permissions migration.
It upgrades `notification_placeholders` in place, preserving existing records.
No external notification provider is required.
