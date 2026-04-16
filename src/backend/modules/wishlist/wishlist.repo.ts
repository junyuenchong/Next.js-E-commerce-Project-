// Feature: Executes wishlist persistence operations for user-scoped product wish entries.
import prisma from "@/backend/core/db/prisma";

// Feature: list active wishlist items for user with product snapshots.
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

// Feature: add wishlist item and reactivate inactive row when present.
export async function addWishlistItemRepo(userId: number, productId: number) {
  // Guard: reactivate existing row instead of creating duplicate (user,product) records.
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

// Guard: soft-remove wishlist item for user/product pair.
export async function removeWishlistItemRepo(
  userId: number,
  productId: number,
) {
  // Feature: soft-remove preserves user history and enables quick restore.
  return prisma.wishlistItem.updateMany({
    where: { userId, productId, isActive: true },
    data: { isActive: false },
  });
}
