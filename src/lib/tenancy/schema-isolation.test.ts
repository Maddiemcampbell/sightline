import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const membershipMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260724010000_v3_organizations_memberships.sql",
  ),
  "utf8",
);
const isolationMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260724020000_v3_tenant_isolation.sql",
  ),
  "utf8",
);
const documentSecurityMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260724030000_v3_document_access_security.sql",
  ),
  "utf8",
);
const auditMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260724040000_v3_audit_logging.sql",
  ),
  "utf8",
);

const tenantTables = [
  "users",
  "projects",
  "vendors",
  "project_vendors",
  "integration_sources",
  "documents",
  "document_extracted_fields",
  "project_detection_settings",
  "detection_runs",
  "ai_analysis_runs",
  "ai_risk_suggestions",
  "daily_brief_deliveries",
  "document_activities",
  "risks",
  "risk_evidence",
  "risk_email_drafts",
  "risk_conversations",
  "risk_conversation_messages",
  "risk_answer_feedback",
  "recommended_actions",
  "risk_resolutions",
  "daily_briefs",
  "brief_items",
  "risk_activities",
] as const;

describe("tenant RLS schema coverage", () => {
  it.each(tenantTables)(
    "%s receives all four organization policies",
    (table) => {
      expect(membershipMigration).toContain(`'${table}'`);
      for (const operation of ["select", "insert", "update", "delete"]) {
        expect(membershipMigration).toContain(
          `tenant_table || '_member_${operation}'`,
        );
      }
    },
  );

  it("removes every direct authenticated storage object policy", () => {
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(documentSecurityMigration).toContain(
        `drop policy if exists source_documents_member_${operation}`,
      );
    }
    expect(documentSecurityMigration).toContain("public = false");
  });

  it("keeps audit history append-only", () => {
    expect(isolationMigration).toContain("audit_logs_member_select");
    expect(isolationMigration).toContain("audit_logs_member_insert");
    expect(isolationMigration).toContain("audit_logs_no_update");
    expect(isolationMigration).toContain("audit_logs_no_delete");
    expect(auditMigration).toContain("audit_logs_reject_update_delete");
    expect(auditMigration).toContain(
      "revoke update, delete, truncate on public.audit_logs",
    );
    expect(auditMigration).toContain("add column ip_address inet");
    expect(auditMigration).toContain("add column correlation_id uuid not null");
  });

  it("binds document object paths to the row organization", () => {
    expect(documentSecurityMigration).toContain(
      "documents_storage_path_document_check",
    );
    expect(documentSecurityMigration).toContain(
      "organization_id::text || '/' || id::text || '/%'",
    );
  });
});
