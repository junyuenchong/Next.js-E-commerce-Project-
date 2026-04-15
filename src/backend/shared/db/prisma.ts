// Initialize and cache Prisma client
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrlForPrisma } from "./resolve-database-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const resolvedUrl = resolveDatabaseUrlForPrisma();

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
