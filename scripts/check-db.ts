import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrlForPrisma } from "../src/backend/shared/db/resolve-database-url";

const dbUrl = resolveDatabaseUrlForPrisma();
const prisma = new PrismaClient({
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
});

async function checkDatabase() {
  try {
    console.log("Checking database contents...\n");

    const categories = await prisma.category.findMany();
    console.log(`Categories found: ${categories.length}`);
    categories.forEach((category) => {
      console.log(`- ${category.name} (${category.slug})`);
    });

    console.log("\n");

    const products = await prisma.product.findMany({
      include: { category: true },
    });
    console.log(`Products found: ${products.length}`);
    products.forEach((product) => {
      console.log(
        `- ${product.title} (${product.price}) - Category: ${product.category?.name ?? "No category"}`,
      );
    });
  } catch (error: unknown) {
    console.error(
      "Error checking database:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void checkDatabase();
