"use server";

import slugify from "slugify";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validators/product";

export async function createProduct(data: unknown) {
  const validated = productSchema.safeParse(data);
  if (!validated.success) throw new Error("Invalid product data");

  const { title, description, price, imageUrl, categoryId } = validated.data;

  const product = await prisma.product.create({
    data: {
      title,
      slug: slugify(title, { lower: true }),
      description,
      price,
      imageUrl,
      categoryId,
    },
  });

  revalidatePath("/admin/products");
  return product;
}
