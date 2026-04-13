import { useCallback, useMemo, useState } from "react";
import { getErrorMessage } from "@/app/lib/http";
import { postCartMutation } from "@/app/modules/user/client";
import { summarizeCartLines } from "@/app/lib/cart";
import type { CartItemRowData } from "@/app/modules/user/types";
import { useCart } from "./useCart";

export function useShoppingCart() {
  const { cart, isLoading, mutate } = useCart();
  const [cartActionError, setCartActionError] = useState("");

  const summary = useMemo(() => {
    const items = (cart?.items ?? []) as CartItemRowData[];
    return summarizeCartLines(items);
  }, [cart?.items]);

  const clearCartActionError = useCallback(() => setCartActionError(""), []);

  const updateQuantity = useCallback(
    async (productId: number, newQuantity: number) => {
      if (newQuantity < 1) return;
      setCartActionError("");
      try {
        await postCartMutation({
          action: "update",
          productId,
          quantity: newQuantity,
        });
      } catch (e: unknown) {
        setCartActionError(getErrorMessage(e, "Could not update the cart."));
      } finally {
        void mutate();
      }
    },
    [mutate],
  );

  const removeItem = useCallback(
    async (productId: number) => {
      setCartActionError("");
      try {
        await postCartMutation({ action: "remove", productId });
      } catch (e: unknown) {
        setCartActionError(getErrorMessage(e, "Could not remove the item."));
      } finally {
        void mutate();
      }
    },
    [mutate],
  );

  const clearCart = useCallback(async () => {
    if (!confirm("Are you sure you want to clear your cart?")) return;
    setCartActionError("");
    try {
      await postCartMutation({ action: "clear" });
    } catch (e: unknown) {
      setCartActionError(getErrorMessage(e, "Could not clear the cart."));
    } finally {
      void mutate();
    }
  }, [mutate]);

  return {
    cart,
    isLoading,
    mutate,
    summary,
    updateQuantity,
    removeItem,
    clearCart,
    cartActionError,
    clearCartActionError,
  };
}
