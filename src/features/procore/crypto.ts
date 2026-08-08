import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getServerEnv } from "@/lib/env";

const VERSION = "v1";

function encryptionKey(): Buffer {
  const value = getServerEnv().PROCORE_CREDENTIAL_ENCRYPTION_KEY;
  if (!value)
    throw new Error(
      "PROCORE_CREDENTIAL_ENCRYPTION_KEY is required to store Procore credentials.",
    );
  return Buffer.from(value, "utf8").subarray(0, 32);
}

export function encryptProcoreSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptProcoreSecret(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue)
    throw new Error("Unsupported Procore credential ciphertext.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
