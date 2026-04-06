import prisma from "@/lib/prisma";
import type { Cart, CartLineItem } from "@prisma/client";
import { randomUUID } from "crypto";

export type CartWithItems = Cart & { items: CartLineItem[] };

export async function findUserCart(
  userId: number,
): Promise<CartWithItems | null> {
  return prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });
}

export async function findGuestCart(
  guestCartId: string,
): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: { guestCartId },
    include: { items: true },
  });
}

export async function createUserCart(userId: number): Promise<CartWithItems> {
  return prisma.cart.create({
    data: {
      id: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    include: { items: true },
  });
}

export async function createGuestCart(
  guestCartId: string,
): Promise<CartWithItems> {
  return prisma.cart.create({
    data: {
      id: randomUUID(),
      guestCartId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    include: { items: true },
  });
}

export async function getProductSnapshot(productId: number) {
  return prisma.product.findUnique({ where: { id: productId } });
}

export async function createCartLineItem(data: {
  cartId: string;
  productId: number;
  quantity: number;
  title?: string | null;
  price?: number | null;
  image?: string | null;
}) {
  return prisma.cartLineItem.create({
    data: {
      id: randomUUID(),
      ...data,
    },
  });
}

export async function updateCartLineItemQuantity(id: string, quantity: number) {
  return prisma.cartLineItem.update({
    where: { id },
    data: { quantity },
  });
}

export async function deleteCartLineItem(id: string) {
  return prisma.cartLineItem.delete({ where: { id } });
}

export async function clearCartLineItems(cartId: string) {
  return prisma.cartLineItem.deleteMany({ where: { cartId } });
}

export async function assignGuestCartToUser(
  guestCartId: string,
  userId: number,
) {
  const guestCart = await prisma.cart.findFirst({ where: { guestCartId } });
  if (!guestCart) return null;
  return prisma.cart.update({
    where: { id: guestCart.id },
    data: { userId, guestCartId: null },
    include: { items: true },
  });
}

export async function mergeGuestIntoUserCart(
  guestCartId: string,
  userId: number,
) {
  const [guestCart, userCart] = await Promise.all([
    prisma.cart.findFirst({ where: { guestCartId }, include: { items: true } }),
    prisma.cart.findUnique({ where: { userId }, include: { items: true } }),
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
      price: item.price,
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
        price: item.price,
        image: item.image,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.cartLineItem.deleteMany({ where: { cartId: userCart.id } });
    if (mergedByProductId.size > 0) {
      await tx.cartLineItem.createMany({
        data: Array.from(mergedByProductId.entries()).map(
          ([productId, data]) => ({
            id: randomUUID(),
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
    include: { items: true },
  });
}

export async function getCartWithProductsByUser(userId: number) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
}

export async function getCartWithProductsByGuest(guestCartId: string) {
  return prisma.cart.findFirst({
    where: { guestCartId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
}
