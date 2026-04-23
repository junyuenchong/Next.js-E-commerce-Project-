// Shared numeric parsing/guard helpers for backend modules.

export function parseInteger(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function parsePositiveInt(value: unknown): number | undefined {
  const parsed = parseInteger(value);
  if (parsed == null || parsed < 1) return undefined;
  return parsed;
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
