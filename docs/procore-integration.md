# Procore integration

Sightline uses Procore as a read-only project system of record. The first
connection release uses Procore Developer Managed Service Accounts (DMSA) with
the OAuth 2.0 client-credentials grant. Procore company administrators install
the app, approve its manifest permissions, and select permitted projects.

## Local/server configuration

Set these server-only values:

```dotenv
PROCORE_API_ENVIRONMENT=sandbox
PROCORE_CLIENT_ID=...
PROCORE_CLIENT_SECRET=...
PROCORE_CREDENTIAL_ENCRYPTION_KEY=<stable random value, at least 32 characters>
```

The encryption key must remain stable for the lifetime of stored connection
credentials. Rotate credentials through the connection UI or a secret-manager
rotation procedure; never commit the client secret or encryption key.

## Current release

The connection foundation supports:

- DMSA/client-credentials token acquisition and in-memory token caching
- sandbox and production Procore API hosts
- timeout, pagination, transient retry, rate-limit retry, and normalized errors
- encrypted connection credentials and organization-isolated connection state
- queued project discovery through the existing scheduler/job infrastructure
- deterministic Procore-to-Sightline project mapping, creation, and skipping
- connection health, disconnect behavior, and audit events

The project discovery client currently uses Procore REST v1.0 projects. Resource
versions are kept in the server-only client so each financial/resource adapter
can select and test its documented API version independently.

## Required Procore setup

For live verification, Sightline needs a Procore Developer Portal app, a
developer sandbox or customer sandbox company, sandbox and production DMSA
credentials, and a permission manifest covering company/project access to the
resources we will ingest. Procore administrators must install the app and grant
the DMSA access to the intended projects.

The exact financial permission set is intentionally not guessed. It will be
finalized against the target Procore company configuration before financial
synchronization is enabled.

## Deliberate next milestone

Financial ingestion is next: budget rows, commitments/direct costs, and change
events will be normalized with source provenance and completeness metadata
before any customer-visible cost-overrun signals are emitted. RFIs, submittals,
documents, webhooks, and margin calculations remain gated behind that financial
foundation so Sightline does not make confident conclusions from incomplete
data.
