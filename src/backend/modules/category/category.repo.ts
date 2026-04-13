import prisma from "@/app/lib/prisma";

export async function findCategoryBySlug(
  slug: string,
  opts?: { activeOnly?: boolean },
) {
  const activeOnly = opts?.activeOnly !== false;
  return prisma.category.findFirst({
    where: { slug, ...(activeOnly ? { isActive: true } : {}) },
  });
}

export async function findCategoryById(id: number) {
  return prisma.category.findUnique({ where: { id } });
}

/** Storefront / nav: active categories only. */
export async function listCategoriesActive() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function findProductsByCategorySlug(params: {
  slug: string;
  take?: number;
  skip?: number;
}) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      category: { slug: params.slug, isActive: true },
    },
    orderBy: { id: "desc" },
    take: params.take,
    skip: params.skip,
    select: {
      id: true,
      title: true,
      description: true,
      compareAtPrice: true,
      price: true,
      imageUrl: true,
      categoryId: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      stock: true,
      isActive: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function findProductsByCategorySlugCursor(params: {
  slug: string;
  take?: number;
  cursorId?: number;
}) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      category: { slug: params.slug, isActive: true },
    },
    orderBy: { id: "desc" },
    take: params.take,
    ...(params.cursorId
      ? {
          cursor: { id: params.cursorId },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      title: true,
      description: true,
      compareAtPrice: true,
      price: true,
      imageUrl: true,
      categoryId: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      stock: true,
      isActive: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

export async function createCategoryRecord(data: {
  name: string;
  slug: string;
}) {
  return prisma.category.create({ data });
}

export async function updateCategoryRecord(
  id: number,
  data: { name: string; slug: string },
) {
  return prisma.category.update({ where: { id }, data });
}

export async function softDeactivateCategoryRecord(id: number) {
  return prisma.category.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function searchCategoriesByName(query: string) {
  return prisma.category.findMany({
    where: {
      isActive: true,
      name: { contains: query, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
  });
}

export async function categorySlugExists(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  return Boolean(category);
}
