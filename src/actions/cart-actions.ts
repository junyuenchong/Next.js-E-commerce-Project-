'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
// @ts-expect-error: uuid import compatibility for both ESM and CJS
import { v4 as uuidv4 } from 'uuid';

interface SessionUser {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
}

type CartItem = {
  id: string;
  productId: number;
  quantity: number;
  title: string | null;
  price: number | null;
  image: string | null;
  cartId?: string;
};

// Get or create a cart (handles both user and guest)
export async function getOrCreateCart() {
  const session = await getServerSession(authOptions);
  let userId: number | undefined = undefined;

  if (session?.user) {
    const user = session.user as SessionUser;
    if (typeof user.id === 'string' && !isNaN(Number(user.id))) {
      userId = Number(user.id);
      console.log('[cart-actions] Extracted userId from user.id:', userId);
    } else if (typeof user.sub === 'string' && !isNaN(Number(user.sub))) {
      userId = Number(user.sub);
      console.log('[cart-actions] Extracted userId from user.sub:', userId);
    } else {
      console.log('[cart-actions] No valid userId found in session.user:', user);
    }
  }

  const cookieStore = await cookies();
  let guestCartId = cookieStore.get('guestCartId')?.value;

  if (userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          id: uuidv4(),
          userId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        },
        include: { items: true }
      });
      console.log('[getOrCreateCart] Created new user cart:', cart.id, 'for userId:', userId);
    } else {
      console.log('[getOrCreateCart] Found user cart:', cart.id, 'for userId:', userId);
    }
    return cart;
  } else {
    if (!guestCartId) {
      guestCartId = uuidv4();
      await cookieStore.set('guestCartId', String(guestCartId), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365
      });
      console.log('[getOrCreateCart] Set new guestCartId cookie:', guestCartId);
    }

    let cart = await prisma.cart.findFirst({
      where: { guestCartId },
      include: { items: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          id: uuidv4(),
          guestCartId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        },
        include: { items: true }
      });
      console.log('[getOrCreateCart] Created new guest cart:', cart.id, 'for guestCartId:', guestCartId);
    } else {
      console.log('[getOrCreateCart] Found guest cart:', cart.id, 'for guestCartId:', guestCartId);
    }

    return cart;
  }
}

// Add an item to the cart
export async function addToCart(productId: number, quantity: number = 1) {
  const cart = await getOrCreateCart();
  if (!cart) throw new Error('Cart not found');

  const existing = cart.items.find((item: CartItem) => Number(item.productId) === Number(productId));

  if (existing) {
    await prisma.cartLineItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity }
    });
    console.log('[addToCart] Updated quantity for productId:', productId, 'in cart:', cart.id);
  } else {
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) throw new Error('Product not found');

    await prisma.cartLineItem.create({
      data: {
        id: uuidv4(),
        cartId: cart.id,
        productId: product.id,
        quantity,
        title: product.title,
        price: product.price,
        image: product.imageUrl
      }
    });
    console.log('[addToCart] Created new CartLineItem for productId:', productId, 'in cart:', cart.id);
  }

  return getOrCreateCart();
}

// Remove from cart server action
export async function removeFromCart(productId: number) {
  const cart = await getOrCreateCart();
  if (!cart) throw new Error('Cart not found');

  const existing = cart.items.find(item => Number(item.productId) === Number(productId));
  if (existing) {
    await prisma.cartLineItem.delete({ where: { id: existing.id } });
  }

  return getOrCreateCart();
}

// Update cart item quantity server action
export async function updateCartItem(productId: number, quantity: number) {
  const cart = await getOrCreateCart();
  if (!cart) throw new Error('Cart not found');

  const existing = cart.items.find(item => Number(item.productId) === Number(productId));
  if (existing) {
    await prisma.cartLineItem.update({
      where: { id: existing.id },
      data: { quantity }
    });
  }

  return getOrCreateCart();
}

// Clear the cart
export async function clearCart() {
  const cart = await getOrCreateCart();
  await prisma.cartLineItem.deleteMany({ where: { cartId: cart.id } });
  return getOrCreateCart();
}

// Merge guest cart into user cart after login
export async function mergeGuestCartToUser() {
  const session = await getServerSession(authOptions);
  let userId: number | undefined = undefined;

  if (session?.user) {
    const user = session.user as SessionUser;
    if (typeof user.id === 'string' && !isNaN(Number(user.id))) {
      userId = Number(user.id);
      console.log('[cart-actions] Extracted userId from user.id:', userId);
    } else if (typeof user.sub === 'string' && !isNaN(Number(user.sub))) {
      userId = Number(user.sub);
      console.log('[cart-actions] Extracted userId from user.sub:', userId);
    } else {
      console.log('[cart-actions] No valid userId found in session.user:', user);
    }
  }

  const cookieStore = await cookies();
  const guestCartId = cookieStore.get('guestCartId')?.value ?? '';

  console.log('[mergeGuestCartToUser] guestCartId:', guestCartId);

  if (!userId || !guestCartId) {
    console.log('[mergeGuestCartToUser] No userId or guestCartId, aborting merge. userId:', userId, 'guestCartId:', guestCartId);
    return;
  }

  const guestCart = await prisma.cart.findFirst({ where: { guestCartId }, include: { items: true } });
  const userCart = await prisma.cart.findUnique({ where: { userId }, include: { items: true } });

  if (!guestCart) {
    console.log('[mergeGuestCartToUser] No guest cart found for guestCartId:', guestCartId);
    return;
  }

  if (!userCart) {
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: { userId, guestCartId: null }
    });
    console.log('[mergeGuestCartToUser] Assigned guest cart to user:', userId);
  } else {
    for (const item of guestCart.items as CartItem[]) {
      const existing = userCart.items.find((i: CartItem) => Number(i.productId) === Number(item.productId));
      if (existing) {
        await prisma.cartLineItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity }
        });
      } else {
        await prisma.cartLineItem.create({
          data: {
            id: uuidv4(),
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            title: item.title,
            price: item.price,
            image: item.image
          }
        });
      }
    }

    await prisma.cart.delete({ where: { id: guestCart.id } });
    console.log('[mergeGuestCartToUser] Merged guest cart items into user cart and deleted guest cart. userId:', userId);
  }

  await cookieStore.set('guestCartId', '', { maxAge: 0, path: '/' });

  return await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
}

// Fetch cart for user or guest, but do NOT create a new one
export async function getCart() {
  const session = await getServerSession(authOptions);
  let userId: number | undefined = undefined;

  if (session?.user) {
    const user = session.user as SessionUser;
    if (typeof user.id === 'string' && !isNaN(Number(user.id))) {
      userId = Number(user.id);
      console.log('[cart-actions] Extracted userId from user.id:', userId);
    } else if (typeof user.sub === 'string' && !isNaN(Number(user.sub))) {
      userId = Number(user.sub);
      console.log('[cart-actions] Extracted userId from user.sub:', userId);
    } else {
      console.log('[cart-actions] No valid userId found in session.user:', user);
    }
  }

  const cookieStore = await cookies();
  const guestCartId = cookieStore.get('guestCartId')?.value;

  if (userId) {
    return await prisma.cart.findUnique({ where: { userId }, include: { items: true } });
  } else if (guestCartId) {
    return await prisma.cart.findFirst({ where: { guestCartId }, include: { items: true } });
  }

  return null;
}

// Server action wrappers for direct import
export async function addToCartServer(productId: number, quantity: number = 1) {
  return addToCart(productId, quantity);
}

export async function removeFromCartServer(productId: number) {
  return removeFromCart(productId);
}

export async function clearCartServer() {
  return clearCart();
}
