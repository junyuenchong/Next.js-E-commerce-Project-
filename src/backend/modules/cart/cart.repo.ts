// performs cart persistence operations for sessions, items, and merge/update workflows.
import prisma from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";
import { moneyToNumber } from "@/backend/core/money";
import type { CartWithItems } from "@/shared/types";

export type { CartWithItems } from "@/shared/types";

type ProductStockRow = {
  id: number;
  stock: number;
  isActive: boolean;
};

/**
 * Handles find user cart.
 */
export async function findUserCart(
  userId: number,
): Promise<CartWithItems | null> {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { productId: "asc" },
      },
    },
  });
}

/**
 * Handles find guest cart.
 */
export async function findGuestCart(
  guestCartId: string,
): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: { guestCartId },
    include: {
      items: {
        orderBy: { productId: "asc" },
      },
    },
  });
}

/**
 * Handles create user cart.
 */
export async function createUserCart(userId: number): Promise<CartWithItems> {
  return prisma.cart.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    include: {
      items: {
        orderBy: { productId: "asc" },
      },
    },
  });
}

/**
 * Handles create guest cart.
 */
export async function createGuestCart(
  guestCartId: string,
): Promise<CartWithItems> {
  return prisma.cart.create({
    data: {
      guestCartId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    include: {
      items: {
        orderBy: { productId: "asc" },
      },
    },
  });
}

/**
 * Handles get product snapshot.
 */
export async function getProductSnapshot(productId: number) {
  // snapshot query only returns active products for cart mutations.
  return prisma.product.findFirst({
    where: { id: productId, isActive: true },
  });
}

/**
 * Handles create cart line item.
 */
export async function createCartLineItem(data: {
  cartId: string;
  productId: number;
  quantity: number;
  title?: string | null;
  price?: number | null;
  image?: string | null;
}) {
  return prisma.cartLineItem.create({
    data,
  });
}

/**
 * Handles update cart line item quantity.
 */
export async function updateCartLineItemQuantity(id: string, quantity: number) {
  // isolate quantity updates so service code stays declarative.
  return prisma.cartLineItem.update({
    where: { id },
    data: { quantity },
  });
}

/**
 * Handles delete cart line item.
 */
export async function deleteCartLineItem(id: string) {
  return prisma.cartLineItem.delete({ where: { id } });
}

/**
 * Handles clear cart line items.
 */
export async function clearCartLineItems(cartId: string) {
  return prisma.cartLineItem.deleteMany({ where: { cartId } });
}

/**
 * Handles reconcile cart line items to stock.
 */
export async function reconcileCartLineItemsToStock(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });
  if (!cart?.items.length) return;

  const productIds = [...new Set(cart.items.map((i) => i.productId))];
  const products = (await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stock: true, isActive: true },
  })) as ProductStockRow[];
  const byId = new Map(products.map((p: ProductStockRow) => [p.id, p]));

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const line of cart.items) {
      const p = byId.get(line.productId);
      if (!p || !p.isActive || p.stock < 1) {
        await tx.cartLineItem.delete({ where: { id: line.id } });
      } else if (line.quantity > p.stock) {
        await tx.cartLineItem.update({
          where: { id: line.id },
          data: { quantity: p.stock },
        });
      }
    }
  });
}

/**
 * Handles assign guest cart to user.
 */
export async function assignGuestCartToUser(
  guestCartId: string,
  userId: number,
) {
  // rebind guest cart ownership to user while clearing guest identifier.
  const guestCart = await prisma.cart.findFirst({ where: { guestCartId } });
  if (!guestCart) return null;
  return prisma.cart.update({
    where: { id: guestCart.id },
    data: { userId, guestCartId: null },
    include: {
      items: {
        orderBy: { productId: "asc" },
      },
    },
  });
}

/**
 * Handles merge guest into user cart.
 */
export async function mergeGuestIntoUserCart(
  guestCartId: string,
  userId: number,
) {
  // merge strategy sums quantities by product id, then clamps to live stock.
  const [guestCart, userCart] = await Promise.all([
    prisma.cart.findFirst({
      where: { guestCartId },
      include: {
        items: {
          orderBy: { productId: "asc" },
        },
      },
    }),
    prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { productId: "asc" },
        },
      },
    }),
  ]);
  if (!guestCart || !userCart) return null;

  const mergedByProductId = new Map<
    number,
    {
      quantity: number;
      title?: string | null;
      price?: number | null;
      image?: string | null;
    }
  >();
  for (const item of userCart.items) {
    mergedByProductId.set(item.productId, {
      quantity: item.quantity,
      title: item.title,
      price: moneyToNumber(item.price),
      image: item.image,
    });
  }
  for (const item of guestCart.items) {
    const existing = mergedByProductId.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      mergedByProductId.set(item.productId, {
        quantity: item.quantity,
        title: item.title,
        price: moneyToNumber(item.price),
        image: item.image,
      });
    }
  }

  const productIds = [...mergedByProductId.keys()];
  if (productIds.length > 0) {
    const products = (await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, isActive: true },
    })) as ProductStockRow[];
    const byId = new Map(products.map((p: ProductStockRow) => [p.id, p]));
    for (const pid of productIds) {
      const p = byId.get(pid);
      const row = mergedByProductId.get(pid);
      if (!row) continue;
      if (!p || !p.isActive || p.stock < 1) {
        mergedByProductId.delete(pid);
        continue;
      }
      row.quantity = Math.min(row.quantity, p.stock);
    }
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // replace user cart lines atomically to avoid partial merge states.
    await tx.cartLineItem.deleteMany({ where: { cartId: userCart.id } });
    if (mergedByProductId.size > 0) {
      await tx.cartLineItem.createMany({
        data: Array.from(mergedByProductId.entries()).map(
          ([productId, data]) => ({
            cartId: userCart.id,
            productId,
            quantity: data.quantity,
            title: data.title ?? null,
            price: data.price ?? null,
            image: data.image ?? null,
          }),
        ),
      });
    }
    await tx.cart.delete({ where: { id: guestCart.id } });
  });

  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { productId: "asc" },
      },
    },
  });
}

/**
 * Handles get cart with products by user.
 */
export async function getCartWithProductsByUser(userId: number) {
  // hydrated cart read path for authenticated users.
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { productId: "asc" },
        include: { product: true },
      },
    },
  });
}

/**
 * Handles get cart with products by guest.
 */
export async function getCartWithProductsByGuest(guestCartId: string) {
  // hydrated cart read path for anonymous sessions.
  return prisma.cart.findFirst({
    where: { guestCartId },
    include: {
      items: {
        orderBy: { productId: "asc" },
        include: { product: true },
      },
    },
  });
}
