"use client";

import { sanitizeMetadata, sanitizeText } from "./sanitize";

export async function captureClientError(
  caught: unknown,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const error =
    caught instanceof Error ? caught : new Error(String(caught ?? "Unknown"));
  await fetch("/api/observability/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      name: sanitizeText(error.name, 120),
      message: sanitizeText(error.message),
      stack: error.stack ? sanitizeText(error.stack, 8_000) : null,
      path: window.location.pathname,
      metadata: sanitizeMetadata({
        ...metadata,
        browser: {
          language: navigator.language,
          platform: navigator.platform,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      }),
    }),
  }).catch(() => undefined);
}
