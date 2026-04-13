import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrlForPrisma } from "../src/backend/shared/db/resolve-database-url";

const dbUrl = resolveDatabaseUrlForPrisma();
const prisma = new PrismaClient({
  ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
});

const categoriesToDelete = [
  "booksa",
  "clothing11",
  "electronics",
  "home-garden",
  "sports",
  "a",
  "aa",
  "aaa",
  "abc",
];

async function deleteCategories() {
  try {
    console.log("Deleting categories...\n");

    for (const slug of categoriesToDelete) {
      try {
        const category = await prisma.category.findUnique({
          where: { slug },
          include: { products: true },
        });

        if (!category) {
          console.log(`Category with slug "${slug}" not found, skipping...`);
          continue;
        }

        if (category.products.length > 0) {
          console.log(
            `Category "${category.name}" [${slug}] has ${category.products.length} product(s). Soft-removing category only (products unchanged).`,
          );
        }

        await prisma.category.update({
          where: { slug },
          data: { isActive: false },
        });

        console.log(`Soft-removed category: ${category.name} [${slug}]`);
      } catch (error: unknown) {
        console.error(
          `Error deleting category with slug "${slug}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    console.log("\nCategory deletion completed.");
  } catch (error: unknown) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void deleteCategories();
