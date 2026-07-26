# Sightline Platform Administration

`/internal/admin` is a staff-only operations application. It uses the shared
Sightline design system, but it does not use the customer workspace shell,
organization membership, or organization authorization roles.

## Security boundary

- A Supabase Auth session establishes identity.
- The identity must have an active `platform_operators` record.
- Capabilities are individually assigned in
  `platform_operator_permissions`; there is no super-admin flag.
- The proxy performs an early active-operator check for every admin request.
- The nested layout validates the operator again on the server.
- Every page validates its specific capability before rendering.
- Operator and customer membership are mutually exclusive and enforced by
  database triggers in both directions.
- `mfa_required` is present for future MFA enforcement. Production operator
  onboarding should require MFA before real support capabilities are enabled.

Unauthorized access is returned as not found to avoid disclosing the existence
of the staff console.

## Local access

After resetting the local database, create a dedicated local staff identity:

```bash
npm run dev:bootstrap-platform-operator
```

Then log in using the credentials printed by the command and open
`http://localhost:3000/internal/admin`. Do not assign this identity to a customer
organization.

## Platform audit

`platform_audit_logs` is append-only and separate from customer audit and
activity records. It captures operator, action, resource, optional organization
and affected user, IP address, user agent, request ID, outcome, and metadata.
Authentication, route views, directory searches, and refresh actions use the
same reusable audit writer.

## Foundation scope

Overview values, directory search results, and service outputs are explicitly
mocked in this milestone. Service interfaces define the future production
boundaries for organizations, users, auditing, jobs, AI usage, health, and
support. Future implementations must preserve capability checks, data
redaction, and platform auditing when replacing mocks.
