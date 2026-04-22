// implements wishlist service methods for item add/remove and list retrieval.
import {
  addWishlistItemRepo,
  listWishlistForUserRepo,
  removeWishlistItemRepo,
} from "./wishlist.repo";

/**
 * List current user's active wishlist items.
 */
export async function listWishlistForUser(userId: number) {
  return listWishlistForUserRepo(userId);
}

/**
 * Add product to user's wishlist (idempotent).
 */
export async function addWishlistItem(userId: number, productId: number) {
  return addWishlistItemRepo(userId, productId);
}

/**
 * Remove (soft-delete) product from user's wishlist.
 */
export async function removeWishlistItem(userId: number, productId: number) {
  return removeWishlistItemRepo(userId, productId);
}
