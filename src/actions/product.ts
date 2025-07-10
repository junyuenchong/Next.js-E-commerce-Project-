"use server";


import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { productSchema } from "@/lib/validators/product";
import prisma from "@/lib/prisma";



/* ----------------------
 CREATE PRODUCT
------------------------- */
export async function createProduct(data: unknown) {
  const parsed = {
    ...(data as any),
    price: parseFloat((data as any).price),
    categoryId: parseInt((data as any).categoryId, 10),
  };

  const validated = productSchema.safeParse(parsed);
  if (!validated.success) throw new Error("Invalid product data");

  const { title, description, price, imageUrl, categoryId } = validated.data;

  const product = await prisma.product.create({
    data: {
      title,
      slug: await generateUniqueSlug(title),
      description,
      price,
      imageUrl,
      categoryId,
    },
  });

  revalidatePath("/admin/products");


  return product;
}

/* ----------------------
 GENERATE UNIQUE SLUG
------------------------- */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

/* ----------------------
 READ ALL PRODUCTS
------------------------- */
export async function getAllProducts() {
  return prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

/* ----------------------
 UPDATE PRODUCT
------------------------- */
export async function updateProduct(id: number, data: unknown) {
  const validated = productSchema.safeParse(data);
  if (!validated.success) throw new Error("Invalid product data");

  const { title, description, price, imageUrl, categoryId } = validated.data;

  const product = await prisma.product.update({
    where: { id },
    data: {
      title,
      slug: await generateUniqueSlug(title),
      description,
      price,
      imageUrl,
      categoryId,
    },
  });


  revalidatePath("/admin/products");

  return product;
}

/* ----------------------
 DELETE PRODUCT
------------------------- */
export async function deleteProduct(id: number) {
  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/products");
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    throw error;
  }
}

/* ----------------------
 SEARCH PRODUCTS
------------------------- */
export async function searchProducts(query: string) {
  if (!query.trim()) return [];

  return prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { category: true },
  });
}
