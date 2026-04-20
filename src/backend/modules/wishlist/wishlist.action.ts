/**
 * wishlist action
 * handle wishlist action logic
 */
// provides wishlist server actions that delegate user wishlist mutations and reads.
import {
  addWishlistItem,
  listWishlistForUser,
  removeWishlistItem,
} from "./wishlist.service";

// thin action exports keep UI/server callers on one stable module entrypoint.
export { addWishlistItem, listWishlistForUser, removeWishlistItem };
