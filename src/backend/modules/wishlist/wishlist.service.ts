// Feature: Implements wishlist service methods for item add/remove and list retrieval.
import {
  addWishlistItemRepo,
  listWishlistForUserRepo,
  removeWishlistItemRepo,
} from "./wishlist.repo";

// Feature: list current user's active wishlist items.
export async function listWishlistForUser(userId: number) {
  // Feature: thin service wrapper; repository enforces active-only row policy.
  return listWishlistForUserRepo(userId);
}

// Feature: add product to user's wishlist (idempotent).
export async function addWishlistItem(userId: number, productId: number) {
  // Feature: add path can reactivate soft-removed rows (handled in repo).
  return addWishlistItemRepo(userId, productId);
}

// Guard: remove (soft-delete) product from user's wishlist.
export async function removeWishlistItem(userId: number, productId: number) {
  // Guard: remove path uses soft-delete to preserve restore/history semantics.
  return removeWishlistItemRepo(userId, productId);
}
