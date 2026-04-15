import prisma from "@/backend/core/db/prisma";

export async function listWishlistForUserRepo(userId: number) {
  return prisma.wishlistItem.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          imageUrl: true,
          stock: true,
          isActive: true,
        },
      },
    },
  });
}

export async function addWishlistItemRepo(userId: number, productId: number) {
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    if (!existing.isActive) {
      return prisma.wishlistItem.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return existing;
  }
  return prisma.wishlistItem.create({
    data: { userId, productId, isActive: true },
  });
}

export async function removeWishlistItemRepo(
  userId: number,
  productId: number,
) {
  return prisma.wishlistItem.updateMany({
    where: { userId, productId, isActive: true },
    data: { isActive: false },
  });
}
