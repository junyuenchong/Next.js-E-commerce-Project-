import {
  addWishlistItemRepo,
  listWishlistForUserRepo,
  removeWishlistItemRepo,
} from "./wishlist.repo";

export async function listWishlistForUser(userId: number) {
  return listWishlistForUserRepo(userId);
}

export async function addWishlistItem(userId: number, productId: number) {
  return addWishlistItemRepo(userId, productId);
}

export async function removeWishlistItem(userId: number, productId: number) {
  return removeWishlistItemRepo(userId, productId);
}
