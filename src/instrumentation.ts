import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs")
    await import("@/features/scheduler/jobs");
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
) => {
  const { reportError } = await import("@/features/observability/service");
  await reportError({
    error,
    source: request.path.startsWith("/api/") ? "api" : "server",
    requestPath: request.path,
    requestMethod: request.method,
    headers: new Headers(
      Object.entries(request.headers).reduce<[string, string][]>(
        (entries, [key, value]) => {
          if (value !== undefined)
            entries.push([
              key,
              Array.isArray(value) ? value.join(", ") : value,
            ]);
          return entries;
        },
        [],
      ),
    ),
  });
};
