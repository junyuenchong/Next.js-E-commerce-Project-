"use client";

import { useCallback, useState } from "react";

// Component-level hook: keeps wishlist mutation out of the product card UI.
export function useProductCardWishlist(productId: number) {
  const [wishPending, setWishPending] = useState(false);

  const saveToWishlist = useCallback(async () => {
    setWishPending(true);
    try {
      await fetch("/features/user/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });
    } finally {
      setWishPending(false);
    }
  }, [productId]);

  return { wishPending, saveToWishlist };
}
