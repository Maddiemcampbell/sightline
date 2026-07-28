const FIELD_PATTERN = /^(\*|\*\/\d+|\d+|\d+-\d+)(,(\*|\*\/\d+|\d+|\d+-\d+))*$/;
const RANGES = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
] as const;

export function isValidCron(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  return (
    fields.length === 5 &&
    fields.every((field, index) => {
      if (!FIELD_PATTERN.test(field)) return false;
      return field.split(",").every((part) => {
        if (part === "*") return true;
        if (part.startsWith("*/")) {
          const step = Number(part.slice(2));
          return Number.isInteger(step) && step > 0;
        }
        const values = part.split("-").map(Number);
        const [minimum, maximum] = RANGES[index]!;
        return values.every(
          (value) =>
            Number.isInteger(value) && value >= minimum && value <= maximum,
        );
      });
    })
  );
}

export function cronMatches(expression: string, date: Date): boolean {
  if (!isValidCron(expression)) return false;
  const values = [
    date.getUTCMinutes(),
    date.getUTCHours(),
    date.getUTCDate(),
    date.getUTCMonth() + 1,
    date.getUTCDay(),
  ];
  return expression
    .trim()
    .split(/\s+/)
    .every((field, index) => fieldMatches(field, values[index]!));
}

function fieldMatches(field: string, value: number): boolean {
  return field.split(",").some((part) => {
    if (part === "*") return true;
    if (part.startsWith("*/")) return value % Number(part.slice(2)) === 0;
    if (part.includes("-")) {
      const [start = 0, end = 0] = part.split("-").map(Number);
      return value >= start && value <= end;
    }
    return value === Number(part);
  });
}
