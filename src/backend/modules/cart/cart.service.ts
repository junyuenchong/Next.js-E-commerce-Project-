// Feature: Implements cart business rules for item updates, pricing, and checkout preparation.
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { moneyToNumber } from "@/backend/core/money";
import { authOptions } from "@/backend/modules/auth";
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

// Note: thrown when cart mutations cannot satisfy quantity vs live stock (API maps to 409).
export const CART_OUT_OF_STOCK = "OUT_OF_STOCK";
export const CART_PRODUCT_UNAVAILABLE = "PRODUCT_UNAVAILABLE";
// Note: unknown product id (API maps to 404).
export const CART_PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND";

type SessionUser = {
  id?: string;
  sub?: string;
};

function resolveUserIdFromSessionUser(user?: SessionUser): number | undefined {
  // Guard: accept both `id` and `sub` to handle provider/session shape differences.
  if (!user) return undefined;
  if (typeof user.id === "string" && !isNaN(Number(user.id)))
    return Number(user.id);
  if (typeof user.sub === "string" && !isNaN(Number(user.sub)))
    return Number(user.sub);
  return undefined;
}

async function getUserAndGuestContext() {
  // Feature: centralized context helper for identical session/cookie resolution.
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userId = resolveUserIdFromSessionUser(user);
  const cookieStore = await cookies();
  const guestCartId = cookieStore.get("guestCartId")?.value;
  return { userId, cookieStore, guestCartId };
}

// Feature: get or create current session cart (user or guest).
export async function getOrCreateCartService() {
  const { userId, cookieStore, guestCartId } = await getUserAndGuestContext();

  if (userId) {
    // Guard: authenticated path always prefers stable user cart.
    const cart = await findUserCart(userId);
    if (cart) return cart;
    return createUserCart(userId);
  }

  let gid = guestCartId;
  if (!gid) {
    // Feature: guest carts get a long-lived UUID cookie for anonymous persistence.
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

// Feature: fetch current session cart without creating one.
export async function getCartService() {
  const { userId, guestCartId } = await getUserAndGuestContext();
  if (userId) return findUserCart(userId);
  if (guestCartId) return findGuestCart(guestCartId);
  return null;
}

// Guard: add product quantity with live stock checks.
export async function addToCartService(productId: number, quantity = 1) {
  // Guard: validate product availability against live snapshot before mutating cart.
  const product = await getProductSnapshot(productId);
  if (!product) throw new Error(CART_PRODUCT_NOT_FOUND);
  if (!product.isActive) throw new Error(CART_PRODUCT_UNAVAILABLE);
  if (product.stock < 1) throw new Error(CART_OUT_OF_STOCK);

  const cart = await getOrCreateCartService();
  const existing = cart.items.find((item) => item.productId === productId);
  const addQty = Math.max(1, quantity);
  if (existing) {
    // Guard: existing line is incremented but capped by live stock.
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

// Feature: remove product line from current session cart when present.
export async function removeFromCartService(productId: number) {
  const cart = await getOrCreateCartService();
  const existing = cart.items.find((item) => item.productId === productId);
  if (existing) {
    await deleteCartLineItem(existing.id);
  }
  return getOrCreateCartService();
}

// Guard: update cart line quantity with stock clamping.
export async function updateCartItemService(
  productId: number,
  quantity: number,
) {
  const cart = await getOrCreateCartService();
  const existing = cart.items.find((item) => item.productId === productId);
  if (!existing) return getOrCreateCartService();

  const product = await getProductSnapshot(productId);
  if (!product || !product.isActive || product.stock < 1) {
    // Fallback: remove stale/unavailable items instead of keeping broken cart lines.
    await deleteCartLineItem(existing.id);
    return getOrCreateCartService();
  }

  const want = Math.max(1, quantity);
  const capped = Math.min(want, product.stock);
  await updateCartLineItemQuantity(existing.id, capped);
  return getOrCreateCartService();
}

// Feature: delete all line items from current session cart.
export async function clearCartService() {
  const cart = await getOrCreateCartService();
  await clearCartLineItems(cart.id);
  return getOrCreateCartService();
}

// Feature: merge anonymous cart into authenticated cart and clear guest cookie.
export async function mergeGuestCartToUserService() {
  const { userId, guestCartId, cookieStore } = await getUserAndGuestContext();
  if (!userId || !guestCartId) return null;

  const userCart = await findUserCart(userId);
  let merged = null;
  if (!userCart) {
    // Feature: fast path claims guest cart directly when user has no cart yet.
    merged = await assignGuestCartToUser(guestCartId, userId);
  } else {
    // Feature: merge path combines line quantities and resolves stock constraints.
    merged = await mergeGuestIntoUserCart(guestCartId, userId);
  }

  if (merged?.id) {
    await reconcileCartLineItemsToStock(merged.id);
    merged = await findUserCart(userId);
  }

  cookieStore.set("guestCartId", "", { maxAge: 0, path: "/" });
  return merged;
}

// Feature: return hydrated cart with latest product snapshot per item.
export async function getCartWithLiveProductsService() {
  const { userId, guestCartId } = await getUserAndGuestContext();
  const cart = userId
    ? await getCartWithProductsByUser(userId)
    : guestCartId
      ? await getCartWithProductsByGuest(guestCartId)
      : null;
  if (!cart) return null;

  // Note: expose product snapshot under `liveProduct` to keep frontend contract explicit.
  return {
    ...cart,
    items: cart.items.map(({ product, ...item }) => ({
      ...item,
      liveProduct: product ?? null,
    })),
  };
}
