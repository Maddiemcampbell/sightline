import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("security audit instrumentation", () => {
  it("covers authentication lifecycle events", () => {
    const actions = source("src/app/auth/actions.ts");
    const callback = source("src/app/auth/callback/route.ts");
    for (const action of [
      "auth.login",
      "auth.logout",
      "auth.password_reset_requested",
      "auth.password_reset_completed",
    ]) {
      expect(`${actions}${callback}`).toContain(`action: "${action}"`);
    }
  });

  it("covers organization, invitation, membership, and permission changes", () => {
    const actions = source("src/app/organization/actions.ts");
    for (const action of [
      "organization.created",
      "organization.updated",
      "invitation.accepted",
      "membership.created",
      "membership.deleted",
      "authorization.permission_changed",
    ]) {
      expect(actions).toContain(`action: "${action}"`);
    }
  });

  it("covers document downloads, settings, and current AI mutations", () => {
    expect(
      source("src/app/api/documents/[documentId]/download/route.ts"),
    ).toContain('action: "document.downloaded"');
    expect(source("src/app/settings/actions.ts")).toContain(
      'action: "settings.updated"',
    );
    expect(source("src/app/internal/ai-review/actions.ts")).toContain(
      'action: "ai.review_updated"',
    );
  });
});
