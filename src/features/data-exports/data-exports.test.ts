import { describe, expect, it } from "vitest";
import {
  buildExportArtifact,
  createZip,
  toCsv,
  type ExportManifest,
} from "@/features/data-exports/archive";
import { isExportDownloadAllowed } from "@/features/data-exports/download-security";
import { canExportOrganizationData } from "@/lib/auth/authorization";

const owner = { organizationId: "org-a", organizationRole: "owner" as const };
const admin = {
  organizationId: "org-a",
  organizationRole: "administrator" as const,
};
const manager = {
  organizationId: "org-a",
  organizationRole: "manager" as const,
};

describe("organization data export", () => {
  it("restricts exports to owners and administrators", () => {
    expect(canExportOrganizationData(owner)).toBe(true);
    expect(canExportOrganizationData(admin)).toBe(true);
    expect(canExportOrganizationData(manager)).toBe(false);
  });

  it("creates a manifest-bearing ZIP with intact named entries", () => {
    const manifest: ExportManifest = {
      schemaVersion: "1.0",
      exportId: "export-1",
      organizationId: "org-a",
      organizationName: "BuildCo",
      generatedAt: "2026-07-24T00:00:00.000Z",
      expiresAt: "2026-07-31T00:00:00.000Z",
      format: "zip",
      datasets: [
        { name: "projects", records: 1, files: ["projects.csv", "data.json"] },
      ],
      exclusions: ["credentials"],
    };
    const artifact = buildExportArtifact("zip", manifest, [
      { name: "projects", rows: [{ id: "p1", name: "Tower" }] },
    ]);
    expect(artifact.contents.readUInt32LE(0)).toBe(0x04034b50);
    expect(artifact.contents.includes(Buffer.from("manifest.json"))).toBe(true);
    expect(artifact.contents.includes(Buffer.from("projects.csv"))).toBe(true);
    expect(artifact.contents.includes(Buffer.from("data.json"))).toBe(true);
    expect(artifact.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(createZip([]).readUInt32LE(0)).toBe(0x06054b50);
  });

  it("escapes formulas and quotes in CSV data", () => {
    const csv = toCsv([{ name: '=HYPERLINK("bad")', note: 'A "quote"' }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('A ""quote""');
  });

  it("rejects cross-tenant, expired, incomplete, and unauthorized downloads", () => {
    const ready = {
      organization_id: "org-a",
      status: "ready",
      storage_path: "org-a/export/file.zip",
      expires_at: "2026-08-01T00:00:00.000Z",
    };
    const now = Date.parse("2026-07-25T00:00:00.000Z");
    expect(isExportDownloadAllowed(owner, ready, now)).toBe(true);
    expect(isExportDownloadAllowed(admin, ready, now)).toBe(true);
    expect(isExportDownloadAllowed(manager, ready, now)).toBe(false);
    expect(
      isExportDownloadAllowed(
        { organizationId: "org-b", organizationRole: "owner" },
        ready,
        now,
      ),
    ).toBe(false);
    expect(
      isExportDownloadAllowed(owner, { ...ready, status: "processing" }, now),
    ).toBe(false);
    expect(
      isExportDownloadAllowed(
        owner,
        ready,
        Date.parse("2026-08-02T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
