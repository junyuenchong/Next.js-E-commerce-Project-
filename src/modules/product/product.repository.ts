import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const productListSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  imageUrl: true,
  slug: true,
  categoryId: true,
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
} satisfies Prisma.ProductSelect;

export type ProductListItem = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;

export async function findProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });
}

export async function findProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function findProducts(params: { take: number; skip: number }) {
  return prisma.product.findMany({
    select: productListSelect,
    orderBy: { updatedAt: "desc" },
    take: params.take,
    skip: params.skip,
  });
}

export async function searchProductsQuery(query: string) {
  return prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
        { category: { slug: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: productListSelect,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function createProductRecord(data: {
  title: string;
  slug: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryId: number;
}) {
  return prisma.product.create({ data });
}

export async function updateProductRecord(
  id: number,
  data: {
    title: string;
    slug: string;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    categoryId: number;
  },
) {
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProductRecord(id: number) {
  return prisma.product.delete({ where: { id } });
}

export async function slugExists(slug: string) {
  const existing = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  return Boolean(existing);
}
