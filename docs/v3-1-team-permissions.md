# Sightline V3.1 team permission model

## Principles

All permission decisions enter through `src/lib/auth/authorization.ts`.
Components may hide unavailable controls for usability, but Server Actions,
services, repository tenant predicates, and PostgreSQL RLS remain the security
boundary. Unknown or missing membership is denied.

Project access is explicit for Managers and Contributors through
`project_memberships`. Owners and Administrators can access every organization
project. Existing members receive existing projects during migration to avoid
an accidental production lockout; administrators should review those initial
assignments.

## Capability matrix

| Capability | Owner | Administrator | Manager | Contributor |
| --- | --- | --- | --- | --- |
| View all organization projects | Yes | Yes | No | No |
| View assigned projects | Yes | Yes | Yes | Yes |
| Edit projects | Yes | Yes | No | No |
| View risks and documents in accessible projects | Yes | Yes | Yes | Yes |
| Manage and resolve risks | Yes | Yes | Yes | No |
| Manage and assign actions | Yes | Yes | Yes | No |
| Complete own assigned actions | Yes | Yes | Yes | Yes |
| Upload documents | Yes | Yes | Yes | Yes |
| Edit document metadata | Yes | Yes | Yes | No |
| Comment | Yes | Yes | Yes | Yes |
| Use AI features | Yes | Yes | Yes | No |
| Manage project members | Yes | Yes | Yes | No |
| Invite/remove members and change roles | Yes | Yes, except owners/admins | No | No |
| Manage organization settings/integrations | Yes | Yes | No | No |
| Transfer ownership | Yes | No | No | No |
| View financial exposure/internal audit | Yes | Limited by capability | No | No |

Administrators cannot create another Owner, modify an Owner, downgrade another
Administrator, or remove another Administrator. Ownership transfer is a single
database transaction: the target becomes Owner and the initiating Owner becomes
Administrator. Self-transfer, transfer to an existing Owner, self-removal, and
removing or downgrading the final Owner are rejected.

## Team mutations

Every mutation validates the authenticated request principal and current
organization membership again inside its Server Action and service. Inputs use
Zod UUID/role schemas. Targets are loaded with both membership ID and active
organization ID.

Role changes write:

1. the membership change (or atomic ownership transfer);
2. a user-facing `team_activity_events` record;
3. an append-only internal audit record with before/after roles;
4. a `notification_placeholders` record for future delivery.

Project assignment changes follow the same activity, audit, and notification
pattern. Invitation creation, resend, and revocation are also recorded.

## Database enforcement

- `organization_memberships.role` accepts only Owner, Administrator, Manager,
  and Contributor.
- A locking database trigger prevents concurrent removal or downgrade of the
  final Owner.
- Ownership transfer locks the organization row and validates both membership
  targets inside a security-definer function available only to the service role.
- Role-aware RLS scopes projects, risks, actions, and documents to assigned
  projects for Managers and Contributors.
- A database trigger restricts Contributor action updates to completing an
  action assigned to their organization user.
- Team, project-membership, notification, and activity tables have
  organization foreign keys, indexes, and RLS.

## Invitations and activity

Invitations store the future role, a hash of the single-use token, expiration,
revocation, last-send timestamp, and send count. Resending extends the expiry;
it does not expose or replace the stored token. Accepted invitations create the
membership with the invited role.

`last_active_at` is updated at most once per 15 minutes when an authenticated
member enters server-side application work. It is an approximate product signal,
not an audit record.
