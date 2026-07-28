const SENSITIVE_KEY =
  /password|secret|token|authorization|cookie|email|phone|address|document|excerpt|content|prompt|body|file/i;
const SECRET_TEXT =
  /(bearer\s+[\w.-]+|(?:password|secret|token|api[_-]?key)\s*[:=]\s*\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi;

export function sanitizeText(value: string, maximum = 2_000): string {
  return value
    .replace(SECRET_TEXT, "[REDACTED]")
    .replace(/([?&])[^=\s]+=[^&\s]+/g, "$1[REDACTED]")
    .slice(0, maximum);
}

export function sanitizeMetadata(
  value: unknown,
  depth = 0,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 3)
    return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 30)
      .map(([key, item]) => {
        if (SENSITIVE_KEY.test(key)) return [key, "[REDACTED]"];
        if (typeof item === "string") return [key, sanitizeText(item, 500)];
        if (
          typeof item === "number" ||
          typeof item === "boolean" ||
          item === null
        )
          return [key, item];
        if (Array.isArray(item))
          return [
            key,
            item
              .slice(0, 20)
              .map((entry) =>
                typeof entry === "string"
                  ? sanitizeText(entry, 200)
                  : typeof entry === "number" || typeof entry === "boolean"
                    ? entry
                    : "[OMITTED]",
              ),
          ];
        return [key, sanitizeMetadata(item, depth + 1)];
      }),
  );
}

export function safeUuid(value: string | null): string | null {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}
