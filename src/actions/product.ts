"use server";

import slugify from "slugify";
import { revalidatePath, revalidateTag } from "next/cache";
import { productSchema, productSlugSchema } from "@/lib/validators";
import prisma from "@/lib/prisma";

/* ----------------------
 CREATE PRODUCT
------------------------- */
export async function createProduct(data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid input data");
  }

  const raw = data as Record<string, unknown>;

  const parsed = {
    ...raw,
    price: Number(raw.price),
    categoryId: Number(raw.categoryId),
  };

  const validated = productSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("❌ Validation error:", validated.error.format());
    throw new Error("Invalid product data");
  }

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
  revalidateTag("products");

  // Emit WebSocket event for real-time updates
  await fetch(`${getBaseUrl()}/api/emit-products-update`, { method: 'POST' });

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
 GET PRODUCT BY SLUG
------------------------- */
export async function getProductBySlug(slug: string) {
  // Validate slug using productSlugSchema
  const parsed = productSlugSchema.parse({ slug });

  const product = await prisma.product.findUnique({
    where: { slug: parsed.slug },
    include: { category: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}

/**
 * Get product by ID
 */
export const getProductById = async (id: string) => {
  // Try to parse id as number, fallback to string if not a valid number
  let productId: number | string = id;
  if (!isNaN(Number(id))) {
    productId = Number(id);
  }

  // Try to find by numeric id, fallback to string id if needed
  const product = await prisma.product.findUnique({
    where: typeof productId === "number"
      ? { id: productId }
      : { id: Number(productId) },
    include: { category: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
}

/* ----------------------
 READ ALL PRODUCTS
------------------------- */
export async function getAllProducts(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : 20; // Increased default limit
  const skip = take && page && page > 1 ? (page - 1) * take : 0;
  
  return prisma.product.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      imageUrl: true,
      slug: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      stock: true, // Added
      isActive: true, // Added
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take,
    skip,
    // Add query optimization hints
    ...(process.env.NODE_ENV === 'production' && {
      // Only add these in production to avoid development issues
    })
  });
}

/* ----------------------
 UPDATE PRODUCT
------------------------- */
export async function updateProduct(id: number, data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid input data");
  }

  const raw = data as Record<string, unknown>;

  const parsed = {
    ...raw,
    price: Number(raw.price),
    categoryId: Number(raw.categoryId),
  };

  const validated = productSchema.safeParse(parsed);
  if (!validated.success) {
    console.error("❌ Validation error:", validated.error.format());
    throw new Error("Invalid product data");
  }

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
  revalidateTag("products");

  // Emit WebSocket event for real-time updates
  await fetch(`${getBaseUrl()}/api/emit-products-update`, { method: 'POST' });

  return product;
}

/* ----------------------
 DELETE PRODUCT
------------------------- */
export async function deleteProduct(id: number) {
  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/products");
    revalidateTag("products");

    // Emit WebSocket event for real-time updates
    await fetch(`${getBaseUrl()}/api/emit-products-update`, { method: 'POST' });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    throw error;
  }
}

/* ----------------------
 SEARCH PRODUCTS
------------------------- */
export async function searchProducts(query: string) {
  if (!query.trim()) {
    // Return all products if query is empty
    return getAllProducts();
  }

  const searchTerm = query.trim();
  
  return prisma.product.findMany({
    where: {
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { category: { name: { contains: searchTerm, mode: "insensitive" } } },
        { category: { slug: { contains: searchTerm, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      imageUrl: true,
      slug: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      stock: true, // <-- Added
      isActive: true, // <-- Added
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    },
    orderBy: { updatedAt: "desc" }, // Consistent ordering
    take: 50, // Limit search results for better performance
  });
}

// Helper to get the correct base URL for event emission
function getBaseUrl() {
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }
  return 'https://next-js-e-commerce-project.onrender.com';
}
