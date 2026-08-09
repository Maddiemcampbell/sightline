export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatPercent(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)}%`;
}

export function formatMoney(
  valueCents: number | null,
  currencyCode: string | null,
) {
  if (valueCents === null) return "Not available";
  if (!currencyCode) return formatCompactNumber(valueCents / 100);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valueCents / 100);
}

export function formatReportDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
