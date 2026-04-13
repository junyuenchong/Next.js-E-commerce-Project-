/**
 * Neon (and similar) **transaction** poolers reuse server sessions; Prisma's default prepared
 * statements then hit Postgres `0A000` — "cached plan must not change result type".
 * `pgbouncer=true` tells the engine to avoid that mode (Prisma + PgBouncer).
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
