/**
 * Handles resolve database url for prisma.
 */
export function resolveDatabaseUrlForPrisma(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw);
    if (url.searchParams.has("pgbouncer")) return raw;
    if (url.hostname.toLowerCase().includes("pooler")) {
      url.searchParams.set("pgbouncer", "true");
      return url.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}
