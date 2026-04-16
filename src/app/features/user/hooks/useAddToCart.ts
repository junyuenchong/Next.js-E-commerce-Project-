import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { setCart, setCartId } from "@/app/redux/store";
import { getErrorMessage } from "@/app/utils/http";
import { postCartMutation } from "@/app/features/user/components/client";
import { cartLinesFromApiPayload } from "@/app/lib/cart";
import { USER_CART_QUERY_KEY } from "./useCart";

export function useAddToCart(productId: number) {
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const add = useCallback(
    async (quantity = 1) => {
      if (isLoading) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await postCartMutation({
          action: "add",
          productId,
          quantity: Math.max(1, quantity),
        });
        const mapped = cartLinesFromApiPayload(data);
        if (mapped) {
          dispatch(setCart(mapped.items));
          dispatch(setCartId(mapped.id));
        }
        queryClient.invalidateQueries({ queryKey: USER_CART_QUERY_KEY });
      } catch (error: unknown) {
        setErrorMessage(getErrorMessage(error, "Failed to add to cart."));
      } finally {
        setLoading(false);
      }
    },
    [dispatch, isLoading, productId, queryClient],
  );

  return { add, isLoading, errorMessage };
}
