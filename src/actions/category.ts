"use server";

import prisma from "@/lib/prisma";
import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { categorySchema, categorySlugSchema } from "@/lib/validators/category";
// Import the emitCategoriesUpdate function from ws-server.js
const { emitCategoriesUpdate } = require('../../ws-server.js');

/* ----------------------
 Generate Unique Slug
------------------------- */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

/* ----------------------
 GET CATEGORY BY SLUG
------------------------- */
export async function getCategoryBySlug(slug: string) {
  // Validate slug using categorySlugSchema
  const parsed = categorySlugSchema.parse({ slug });

  const category = await prisma.category.findUnique({
    where: { slug: parsed.slug },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
}

/* ----------------------
 GET ALL PRODUCTS
------------------------- */
export async function getAllProducts(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : undefined;
  const skip = take && page && page > 1 ? (page - 1) * take : undefined;

  // Get all products with optimized query
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take,
    skip,
    // Select only necessary fields for better performance
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      imageUrl: true,
      categoryId: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      stock: true, // Add this
      isActive: true, // Add this
    },
  });

  return products;
}

/* ----------------------
 GET PRODUCTS BY CATEGORY SLUG
------------------------- */
export async function getProductsByCategorySlug(slug: string, limit?: number, page?: number) {
  // Validate slug using categorySlugSchema
  const parsed = categorySlugSchema.parse({ slug });

  // Get the category by slug
  const category = await prisma.category.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const take = limit && limit > 0 ? limit : undefined;
  const skip = take && page && page > 1 ? (page - 1) * take : undefined;

  // Get products by categoryId with optimized query
  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
    skip,
    // Select only necessary fields for better performance
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      imageUrl: true,
      categoryId: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      stock: true, // Add this
      isActive: true, // Add this
    },
  });

  return products;
}


/* ----------------------
 CREATE CATEGORY
------------------------- */
export async function createCategory(name: string) {
  // Validate name using categorySchema
  const parsed = categorySchema.parse({ name });

  const slug = await generateUniqueSlug(parsed.name);

  try {
    const category = await prisma.category.create({
      data: {
        name: parsed.name.trim(),
        slug,
      },
    });

    revalidatePath("/admin/categories");
    
    // Emit WebSocket event for real-time updates
    emitCategoriesUpdate();

    return category;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Category with this name already exists.");
    }
    throw error;
  }
}

/* ----------------------
 GET ALL CATEGORIES
------------------------- */
export async function getAllCategories() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

/* ----------------------
 GET CATEGORY BY ID
------------------------- */
export async function getCategoryById(id: number) {
  // No validation needed for ID lookup
  return await prisma.category.findUnique({
    where: { id },
  });
}

/* ----------------------
 UPDATE CATEGORY
------------------------- */
export async function updateCategory(id: number, name: string) {
  // Validate name using categorySchema
  const parsed = categorySchema.parse({ name });

  const slug = await generateUniqueSlug(parsed.name);

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: parsed.name.trim(),
        slug,
      },
    });

    revalidatePath("/admin/categories");
    
    // Emit WebSocket event for real-time updates
    emitCategoriesUpdate();

    return updated;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("A category with this name or slug already exists.");
    }
    throw error;
  }
}

/* ----------------------
 DELETE CATEGORY
------------------------- */
export async function deleteCategory(id: number) {
  // No validation needed for delete
  const deleted = await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/admin/categories");
  
  // Emit WebSocket event for real-time updates
  emitCategoriesUpdate();
  
  return deleted;
}

/* ----------------------
 SEARCH CATEGORIES BY NAME
------------------------- */
export async function searchCategories(query: string) {
  // Validate query using categorySchema
  const parsed = categorySchema.parse({ name: query });

  return await prisma.category.findMany({
    where: {
      name: {
        contains: parsed.name,
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
  });
}
