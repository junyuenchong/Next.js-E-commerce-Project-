/**
 * wishlist service
 * handle wishlist service logic
 */
// implements wishlist service methods for item add/remove and list retrieval.
import {
  addWishlistItemRepo,
  listWishlistForUserRepo,
  removeWishlistItemRepo,
} from "./wishlist.repo";

// list current user's active wishlist items.
export async function listWishlistForUser(userId: number) {
  // thin service wrapper; repository enforces active-only row policy.
  return listWishlistForUserRepo(userId);
}

// add product to user's wishlist (idempotent).
export async function addWishlistItem(userId: number, productId: number) {
  // add path can reactivate soft-removed rows (handled in repo).
  return addWishlistItemRepo(userId, productId);
}

// remove (soft-delete) product from user's wishlist.
export async function removeWishlistItem(userId: number, productId: number) {
  // remove path uses soft-delete to preserve restore/history semantics.
  return removeWishlistItemRepo(userId, productId);
}
