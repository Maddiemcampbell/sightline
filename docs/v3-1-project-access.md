# Sightline project access model

## Decision model

Every project decision evaluates three independent facts:

1. the authenticated request principal has an active organization membership;
2. the organization role grants the requested capability;
3. the principal has an explicit membership in the target project, unless the
   organization role is Owner or Administrator.

Organization roles are a capability ceiling. A project role cannot grant a
Contributor an organization capability reserved for Managers. Project
membership determines the scope where an allowed capability applies.

## Project roles

| Project role | Access                                                                             |
| ------------ | ---------------------------------------------------------------------------------- |
| Owner        | Full project control, permissions, risks, actions, documents, and membership       |
| Manager      | Manage project work, risks, actions, documents, and members                        |
| Contributor  | View and contribute to assigned work; upload documents; complete permitted actions |
| Viewer       | Read-only access to the project and its related records                            |

Organization Owners and Administrators bypass explicit project assignment and
can access every project. Organization Managers and Contributors see only
projects represented by a `project_memberships` row.

## Authorization API

Project-facing mutations and routes use the centralized helpers:

- `canViewProject()`
- `canEditProject()`
- `canAssignProject()`
- `canViewProjectDocuments()`
- `canUploadProjectDocument()`
- `canResolveProjectRisks()`
- `canAssignProjectActions()`

`requireProjectAccess()`, `requireRiskProjectAccess()`, and
`requireActionProjectAccess()` resolve the target project and explicit project
role on the server. UI visibility is never treated as authorization.

## Data enforcement

PostgreSQL RLS filters projects at query time. Risks, recommended actions,
documents, evidence, comments/activity, resolutions, email drafts, document
activity, and AI conversations inherit access through their parent project.
This means an organization-scoped query naturally returns only accessible
projects and related rows; client-side filtering is not part of the security
boundary.

Document upload requires an assigned project for Managers and Contributors.
Viewers cannot upload. Downloads resolve the document, its project, and the
current project membership before a short-lived signed URL is issued.

Assignments take effect immediately because project pages are dynamically
rendered and RLS reads `project_memberships` on every request.

## Membership management

The project access dialog supports individual or bulk assignment, role changes
through upsert, bulk removal, and email invitations. Targets must already be
members of the same organization. Project invitation acceptance requires the
authenticated email to match and an existing organization membership.

Assignment and removal operations record an internal audit event and a
user-facing team activity event. Invitation tokens are random, stored only as
SHA-256 hashes, single-use, and expire after seven days.

## Deployment

Apply `20260724060000_v3_project_permissions.sql` after the Team Management
migration. Existing project assignments retain access and default to
Contributor; organization Owners and Administrators retain automatic access.
Review existing assignments and elevate project Owners/Managers deliberately
after migration.
