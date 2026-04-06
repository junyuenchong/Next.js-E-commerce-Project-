const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Categories to delete based on slugs
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
          console.log(
            `⚠️  Category with slug "${slug}" not found, skipping...`,
          );
          continue;
        }

        // Check if category has products
        if (category.products && category.products.length > 0) {
          console.log(
            `⚠️  Category "${category.name}" [${slug}] has ${category.products.length} product(s). Products will be deleted due to cascade.`,
          );
        }

        await prisma.category.delete({
          where: { slug },
        });

        console.log(`✓ Deleted category: ${category.name} [${slug}]`);
      } catch (error) {
        console.error(
          `❌ Error deleting category with slug "${slug}":`,
          error.message,
        );
      }
    }

    console.log("\n✅ Category deletion completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteCategories();
