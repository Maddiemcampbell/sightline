import { createHash } from "node:crypto";

export type ExportDataset = Readonly<{
  name: string;
  rows: readonly Record<string, unknown>[];
}>;

export type ExportManifest = Readonly<{
  schemaVersion: "1.0";
  exportId: string;
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  format: "csv" | "json" | "zip";
  expiresAt: string;
  datasets: readonly Readonly<{
    name: string;
    records: number;
    files: readonly string[];
  }>[];
  exclusions: readonly string[];
}>;

export function buildExportArtifact(
  format: "csv" | "json" | "zip",
  manifest: ExportManifest,
  datasets: readonly ExportDataset[],
) {
  const manifestJson = prettyJson(manifest);
  if (format === "json") {
    const contents = Buffer.from(
      prettyJson({
        manifest,
        data: Object.fromEntries(datasets.map((set) => [set.name, set.rows])),
      }),
    );
    return artifact(contents, `${safeName(manifest.organizationName)}-export.json`, "application/json");
  }
  const csvFiles = datasets.map((set) => ({
    name: `${set.name}.csv`,
    contents: Buffer.from(toCsv(set.rows)),
  }));
  const files =
    format === "zip"
      ? [
          { name: "manifest.json", contents: Buffer.from(manifestJson) },
          ...csvFiles,
          {
            name: "data.json",
            contents: Buffer.from(
              prettyJson(Object.fromEntries(datasets.map((set) => [set.name, set.rows]))),
            ),
          },
        ]
      : [{ name: "manifest.json", contents: Buffer.from(manifestJson) }, ...csvFiles];
  return artifact(
    createZip(files),
    `${safeName(manifest.organizationName)}-export-${format}.zip`,
    "application/zip",
  );
}

function artifact(contents: Buffer, name: string, mimeType: string) {
  return {
    contents,
    name,
    mimeType,
    checksum: createHash("sha256").update(contents).digest("hex"),
  };
}

export function toCsv(rows: readonly Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!columns.length) return "";
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\r\n") + "\r\n";
}

function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function prettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sightline";
}

export function createZip(
  files: readonly Readonly<{ name: string; contents: Buffer }>[],
) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const crc = crc32(file.contents);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(file.contents.length, 18);
    header.writeUInt32LE(file.contents.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, file.contents);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x0800, 8);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(file.contents.length, 20);
    directory.writeUInt32LE(file.contents.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += header.length + name.length + file.contents.length;
  }
  const centralSize = central.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
