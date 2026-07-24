# Sightline V3.1 authorization

## Philosophy

Authentication proves who made a request. Organization membership establishes
the tenant. Row-level security enforces the database boundary. Authorization
then decides what that verified member may do inside the organization.

Every application permission decision flows through
`src/lib/auth/authorization.ts`. Components, actions, services, and route
handlers must not compare role strings or invent local permission rules.
Client-side visibility is only presentation; server authorization and RLS are
the enforcement boundaries.

## API

The centralized service exposes a generic `can(subject, permission, resource)`
decision and named, discoverable functions:

- `canViewProject()`
- `canEditProject()`
- `canViewRisk()`
- `canResolveRisk()`
- `canAssignAction()`
- `canViewDocument()`
- `canEditDocument()`
- `canUploadDocument()`
- `canManageMembers()`
- `canManageOrganization()`
- `canViewFinancialExposure()`

Resource-aware checks also compare the resource's `organization_id` with the
verified subject. `assertAuthorized()` converts denied decisions into the same
non-disclosing `Resource not found` error used for missing and cross-tenant
resources.

## Roles and extension

`OrganizationRole` contains `owner`, `administrator`, `manager`, and
`contributor`. Only Owner is currently persisted or supported. Owner receives
all current capabilities. Future roles are present in the exhaustive permission
matrix but deny every capability by default.

Introducing a role therefore requires:

1. approving its capability set in the central matrix;
2. extending the database membership-role constraint and generated types;
3. adding policy-matrix and end-to-end tests; and
4. adding role-management workflows.

Call sites do not change when a future role is enabled.

## Enforcement placement

- Server Components and data-access functions authorize before loading or
  returning protected views, especially financial exposure.
- Server Actions and route handlers authorize again immediately after resolving
  the verified actor context.
- Organization services use `canManageMembers()` for invitations and
  `canManageOrganization()` for profile changes.
- RLS remains mandatory defense in depth and cannot be replaced by these
  application checks.
- Background jobs use explicit organization contexts and service credentials;
  they are system operations rather than organization-role decisions.

Permission checks should be close to the protected operation. UI code may call
the same named functions to hide unavailable controls, but hiding a control
never replaces its server-side check.
