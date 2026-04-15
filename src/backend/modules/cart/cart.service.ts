import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { moneyToNumber } from "@/backend/core/money";
import { authOptions } from "@/app/utils/auth";
import { randomUUID } from "crypto";
import {
  assignGuestCartToUser,
  clearCartLineItems,
  createCartLineItem,
  createGuestCart,
  createUserCart,
  deleteCartLineItem,
  findGuestCart,
  findUserCart,
  getCartWithProductsByGuest,
  getCartWithProductsByUser,
  getProductSnapshot,
  mergeGuestIntoUserCart,
  reconcileCartLineItemsToStock,
  updateCartLineItemQuantity,
} from "./cart.repo";

/** Thrown when cart mutations cannot satisfy quantity vs live stock (API maps to 409). */
export const CART_OUT_OF_STOCK = "OUT_OF_STOCK";
export const CART_PRODUCT_UNAVAILABLE = "PRODUCT_UNAVAILABLE";
/** Unknown product id (API maps to 404). */
export const CART_PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND";

type SessionUser = {
  id?: string;
  sub?: string;
};

function resolveUserIdFromSessionUser(user?: SessionUser): number | undefined {
  if (!user) return undefined;
  if (typeof user.id === "string" && !isNaN(Number(user.id)))
    return Number(user.id);
  if (typeof user.sub === "string" && !isNaN(Number(user.sub)))
    return Number(user.sub);
  return undefined;
}

async function getUserAndGuestContext() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = resolveUserIdFromSessionUser(user);
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("guestCartId")?.value;
  return { userId, cookieStore, guestCartId };
}

export async function getOrCreateCartService() {
  const { userId, cookieStore, guestCartId } = await getUserAndGuestContext();

  if (userId) {
    const cart = await findUserCart(userId);
    if (cart) return cart;
    return createUserCart(userId);
  }

  let gid = guestCartId;
  if (!gid) {
    gid = randomUUID();
    cookieStore.set("guestCartId", gid, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const cart = await findGuestCart(gid);
  if (cart) return cart;
  return createGuestCart(gid);
}

export async function getCartService() {
  const { userId, guestCartId } = await getUserAndGuestContext();
  if (userId) return findUserCart(userId);
  if (guestCartId) return findGuestCart(guestCartId);
  return null;
}

export async function addToCartService(productId: number, quantity = 1) {
  const product = await getProductSnapshot(productId);
  if (!product) throw new Error(CART_PRODUCT_NOT_FOUND);
  if (!product.isActive) throw new Error(CART_PRODUCT_UNAVAILABLE);
  if (product.stock < 1) throw new Error(CART_OUT_OF_STOCK);

  const cart = await getOrCreateCartService();
  const existing = cart.items.find((item) => item.productId === productId);
  const addQty = Math.max(1, quantity);
  if (existing) {
    const next = existing.quantity + addQty;
    const capped = Math.min(next, product.stock);
    if (capped < 1) throw new Error(CART_OUT_OF_STOCK);
    await updateCartLineItemQuantity(existing.id, capped);
    return getOrCreateCartService();
  }

  const initial = Math.min(addQty, product.stock);
  if (initial < 1) throw new Error(CART_OUT_OF_STOCK);

  await createCartLineItem({
    cartId: cart.id,
    productId: product.id,
    quantity: initial,
    title: product.title,
    price: moneyToNumber(product.price),
    image: product.imageUrl,
  });
  return getOrCreateCartService();
}

export async function removeFromCartService(productId: number) {
  const cart = await getOrCreateCartService();
  const existing = cart.items.find((item) => item.productId === productId);
  if (existing) {
    await deleteCartLineItem(existing.id);
  }
  return getOrCreateCartService();
}

export async function updateCartItemService(
  productId: number,
  quantity: number,
) {
  const cart = await getOrCreateCartService();
  const existing = cart.items.find((item) => item.productId === productId);
  if (!existing) return getOrCreateCartService();

  const product = await getProductSnapshot(productId);
  if (!product || !product.isActive || product.stock < 1) {
    await deleteCartLineItem(existing.id);
    return getOrCreateCartService();
  }

  const want = Math.max(1, quantity);
  const capped = Math.min(want, product.stock);
  await updateCartLineItemQuantity(existing.id, capped);
  return getOrCreateCartService();
}

export async function clearCartService() {
  const cart = await getOrCreateCartService();
  await clearCartLineItems(cart.id);
  return getOrCreateCartService();
}

export async function mergeGuestCartToUserService() {
  const { userId, guestCartId, cookieStore } = await getUserAndGuestContext();
  if (!userId || !guestCartId) return null;

  const userCart = await findUserCart(userId);
  let merged = null;
  if (!userCart) {
    merged = await assignGuestCartToUser(guestCartId, userId);
  } else {
    merged = await mergeGuestIntoUserCart(guestCartId, userId);
  }

  if (merged?.id) {
    await reconcileCartLineItemsToStock(merged.id);
    merged = await findUserCart(userId);
  }

  cookieStore.set("guestCartId", "", { maxAge: 0, path: "/" });
  return merged;
}

export async function getCartWithLiveProductsService() {
  const { userId, guestCartId } = await getUserAndGuestContext();
  const cart = userId
    ? await getCartWithProductsByUser(userId)
    : guestCartId
      ? await getCartWithProductsByGuest(guestCartId)
      : null;
  if (!cart) return null;

  return {
    ...cart,
    items: cart.items.map(({ product, ...item }) => ({
      ...item,
      liveProduct: product ?? null,
    })),
  };
}
