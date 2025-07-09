"use server";

import prisma from "@/lib/prisma";
import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

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
 CREATE CATEGORY
------------------------- */
export async function createCategory(name: string) {
  if (!name || name.trim().length === 0) {
    throw new Error("Category name is required");
  }

  const slug = await generateUniqueSlug(name);

  try {
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
      },
    });

    revalidatePath("/admin/categories");
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
  if (!id || typeof id !== "number") {
    throw new Error("Valid category ID is required");
  }

  return await prisma.category.findUnique({
    where: { id },
  });
}

/* ----------------------
 UPDATE CATEGORY
------------------------- */
export async function updateCategory(id: number, name: string) {
  if (!name || name.trim().length === 0) {
    throw new Error("Category name is required");
  }

  const slug = await generateUniqueSlug(name);

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug,
      },
    });

    revalidatePath("/admin/categories");
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
  const deleted = await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/admin/categories");
  return deleted;
}

/* ----------------------
 SEARCH CATEGORIES BY NAME
------------------------- */
export async function searchCategories(query: string) {
  return await prisma.category.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
  });
}
