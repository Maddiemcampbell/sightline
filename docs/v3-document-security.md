# Sightline V3.1 document security

## Boundary

Document metadata and object bytes have separate but coordinated controls:

1. the request must have a verified Supabase session and active organization
   membership;
2. the centralized authorization service must grant the document capability;
3. document metadata is selected with the active `organization_id` and remains
   protected by PostgreSQL RLS;
4. the metadata row's `storage_path` must contain the exact organization and
   document UUID prefixes; and
5. only a server endpoint may use privileged Storage access.

Missing, malformed, archived, cross-organization, path-mismatched, and
missing-object downloads all return the same `404 File not found` response.
This prevents document UUID probing from revealing whether a record exists.

## Bucket and signed URLs

`source-documents` is private. The final document-security migration removes
all authenticated `storage.objects` policies, so browsers and authenticated
Supabase clients cannot list, upload, update, download, or delete bucket
objects directly.

The upload and download endpoints resolve the verified actor first. Only after
application authorization do they use the service role for the individual
Storage operation. Downloads redirect to a 60-second signed URL with download
disposition. Responses are private, non-cacheable, and use a no-referrer
policy.

Signed URLs are bearer credentials until expiration. They must not be logged,
persisted, placed in analytics, or shared. Immediate revocation is not assumed;
the short lifetime bounds exposure.

## Upload validation

The only upload endpoint is `POST /api/documents`. It:

- authorizes `canUploadDocument()` server-side;
- rate-limits by verified organization and application user, not a spoofable
  forwarding header;
- enforces a 10 MiB application limit and the same bucket limit;
- reads and validates actual bytes rather than trusting the browser MIME value;
- allows only PDF, DOCX, CSV, JPEG, and PNG;
- requires the declared MIME type, when supplied, to match detected bytes;
- requires matching filename extensions;
- sanitizes Unicode and removes path separators and unsafe filename symbols;
- validates project and vendor IDs inside the active organization;
- uses a generated document UUID and an
  `<organization>/<document>/<filename>` object path; and
- removes the object if metadata or activity persistence fails.

The current DOCX validation recognizes the ZIP signature and required Office
package entries. Malware scanning and content-disarm/reconstruction are not
implemented; production deployment should add asynchronous scanning before
untrusted files are made downloadable.

## Downloads and previews

The only byte-download endpoint is
`GET /api/documents/[documentId]/download`. It validates the UUID, loads
organization-scoped metadata through the authenticated client, checks
`canViewDocument()`, rejects archived rows, validates the exact object path,
and creates the signed URL with a server-only privileged client.

Sightline currently has no raw-file preview endpoint. Document pages show
escaped metadata only. Evidence cards show database-stored extracted text
through React escaping and link to the same authorized download endpoint.
Future inline previews must use a separate authorized endpoint, restrictive
content security policy, sandboxed rendering, and must never expose a
long-lived or public object URL.

## Operational assumptions

- The service-role key is server-only and never uses a `NEXT_PUBLIC_` variable.
- Supabase Auth session validation and organization membership resolution occur
  before document authorization.
- RLS remains enabled on document metadata tables.
- Object names are not secrets; access control does not depend on UUID
  unpredictability.
- The in-memory upload limiter is defense in depth for a single process. A
  shared production rate limiter is required for horizontally scaled
  deployments.
- Application logs must not include file contents, signed URLs, or raw Storage
  errors returned to users.
