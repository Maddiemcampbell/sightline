export type RawSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

export function firstParam(
  params: RawSearchParams,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function preservedParams(params: RawSearchParams) {
  const result = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) result.set(key, value);
  }
  return result;
}
