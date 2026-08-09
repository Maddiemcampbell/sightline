# Microsoft 365 SharePoint integration

## Scope

Sightline connects one Microsoft Entra tenant per organization, discovers
document libraries in explicitly authorized SharePoint sites, maps selected
libraries to Sightline projects, and imports supported files through Microsoft
Graph delta queries. The integration is read-only; Sightline never changes the
customer's Microsoft content.

The first release supports PDF, DOCX, CSV, JPEG, and PNG files up to 10 MB. It
does not ingest Outlook mail, Teams messages, SharePoint lists, permissions, or
personal OneDrive content.

## Entra application registration

Create a multi-tenant web application in Microsoft Entra ID:

1. Add the application permission `Sites.Selected` for Microsoft Graph.
2. Grant administrator consent for that permission in the customer tenant.
3. Add `${APP_URL}/api/integrations/microsoft365/callback` as a web redirect URI.
4. Create a client secret and store its value only as
   `MICROSOFT365_CLIENT_SECRET`. Store the application ID as
   `MICROSOFT365_CLIENT_ID`.
5. Use a short-lived secret in development. Prefer a certificate or workload
   identity before the production secret expires.

`Sites.Selected` grants no site access by itself. A SharePoint administrator
must separately grant the Sightline service principal `read` access to each
site that will be entered in the integration screen. Do not grant `write` or
`fullcontrol` for this read-only integration.

## Customer setup

1. An organization Owner or Administrator opens **Integrations → Microsoft 365**.
2. A Microsoft tenant administrator completes the admin-consent flow.
3. A SharePoint administrator grants the Sightline application read access to
   the intended site.
4. The Sightline administrator enters the full SharePoint site URL and chooses
   **Discover libraries**.
5. Each intended document library is mapped to a Sightline project and marked
   **Sync**.
6. **Sync now** enqueues durable work. The central scheduler processes queued
   Microsoft jobs every five minutes.

## Synchronization behavior

- Initial synchronization traverses the library's driveItem delta feed.
- Sightline follows every `@odata.nextLink` and stores the final
  `@odata.deltaLink` only after the entire run succeeds.
- External identity is `{driveId}:{driveItemId}`. File checksums or eTags avoid
  unnecessary downloads.
- Imported bytes use the same private, organization-scoped storage bucket and
  validation rules as manual uploads.
- Deleted Microsoft items archive the corresponding Sightline document.
- Unsupported types and files larger than 10 MB are skipped.
- A failed library does not advance its delta cursor. The durable job can retry
  without losing changes.

## Operational checks

- Alert on `microsoft365_sync` job failures and stale `last_completed_at` values.
- Rotate the Entra client secret before expiry and deploy the replacement as a
  server-only value.
- Confirm application logs redact authorization headers and never log document
  bodies or Graph tokens.
- Disconnecting stops synchronization and deactivates SharePoint provenance
  sources. It does not delete previously imported documents.
