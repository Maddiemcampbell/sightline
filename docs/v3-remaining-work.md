# Remaining V3 work

The V3.1 administration foundation now covers profile, team, organization,
security, notification, audit, and project-default settings. The following work
is intentionally deferred.

## Security

- MFA enrollment, recovery codes, and step-up authentication.
- A first-class session registry with device names, approximate locations, and
  individual revocation. The current screen shows the verified Supabase session
  and can terminate all other sessions.
- Scoped personal and service API keys, rotation, expiration, and usage audit.
- Organization security policies such as enforced MFA and session lifetime.

## Billing and plans

- Subscription provider integration, plan changes, invoices, and billing roles.
- Enforced plan limits for members, projects, AI usage, and storage.
- Usage metering beyond the current live organization counts and stored-byte
  summary.

## Branding and files

- Managed organization-logo upload, transformation, and deletion. The current
  setting accepts an HTTPS logo URL.
- Branded email templates and customer domains.

## Notifications

- Email and push delivery workers, retries, suppression, and delivery history.
- Quiet hours, project-specific overrides, and per-notification channel choices.
- Applying organization defaults automatically during membership creation.

## Administration

- Audit CSV export with authorization, streaming, and export audit events.
- Organization deletion and ownership-transfer UX consolidation.
- Bulk project-default application to existing projects.
- Industry-specific configuration presets and custom currencies.

## Operational readiness

- Apply and validate `20260724080000_v3_organization_settings.sql` in every
  environment.
- Add browser coverage for settings mutations against the local Supabase stack.
- Add observability for failed settings writes and Supabase Auth session
  revocation.
