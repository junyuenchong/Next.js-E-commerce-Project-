import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

export async function POST() {
  try {
    const results = [];

    for (const slug of categoriesToDelete) {
      try {
        const category = await prisma.category.findUnique({
          where: { slug },
          include: { products: true },
        });

        if (!category) {
          results.push({
            slug,
            status: "not_found",
            message: `Category with slug "${slug}" not found`,
          });
          continue;
        }

        // Check if category has products
        const productCount = category.products?.length || 0;

        await prisma.category.delete({
          where: { slug },
        });

        results.push({
          slug,
          name: category.name,
          status: "deleted",
          message: `Deleted "${category.name}" [${slug}]${productCount > 0 ? ` (${productCount} product(s) also deleted)` : ""}`,
        });
      } catch (error) {
        results.push({
          slug,
          status: "error",
          message: `Error deleting category with slug "${slug}": ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        results,
        summary: {
          total: categoriesToDelete.length,
          deleted: results.filter((r) => r.status === "deleted").length,
          notFound: results.filter((r) => r.status === "not_found").length,
          errors: results.filter((r) => r.status === "error").length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
