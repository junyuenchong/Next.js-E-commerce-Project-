import { useEffect, useRef } from "react";
import type { AppDispatch } from "@/app/redux/store";
import { setCart, clearCart, setCartId } from "@/app/redux/store";
import type { QueryClient } from "@tanstack/react-query";
import { fetchCart, mergeGuestCart } from "@/app/modules/user/client";
import { USER_CART_QUERY_KEY } from "./useCart";
import { cartLinesFromApiPayload } from "@/app/lib/cart";

type SessionUserLike = {
  id: string | number;
};

export function useUserSessionSync(
  data: { user?: SessionUserLike } | null | undefined,
  isLoading: boolean,
  dispatch: AppDispatch,
  queryClient: QueryClient,
) {
  const hasMerged = useRef(false);
  const prevUserId = useRef<string | number | null>(null);
  const wasLoggedIn = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      if (data?.user) {
        if (prevUserId.current !== data.user.id && !hasMerged.current) {
          hasMerged.current = true;
          prevUserId.current = data.user.id;
          mergeGuestCart().then(async () => {
            const merged = await fetchCart();
            const mapped = cartLinesFromApiPayload(merged);
            if (mapped) {
              dispatch(setCart(mapped.items));
              dispatch(setCartId(mapped.id));
            }
            queryClient.invalidateQueries({ queryKey: USER_CART_QUERY_KEY });
          });
        }
        wasLoggedIn.current = true;
        dispatch(clearCart());
        dispatch(setCartId(""));
      }
      fetchCart().then((result: unknown) => {
        switch (!data?.user) {
          case false:
            return;
        }
        switch (Boolean(result)) {
          case true: {
            const mapped = cartLinesFromApiPayload(result);
            if (mapped) {
              dispatch(setCart(mapped.items));
              dispatch(setCartId(mapped.id));
            }
            break;
          }
          default:
            dispatch(setCart([]));
            dispatch(setCartId(""));
        }
      });
    }
    if (!data?.user && wasLoggedIn.current) {
      hasMerged.current = false;
      prevUserId.current = null;
      wasLoggedIn.current = false;
    }
  }, [data?.user, isLoading, dispatch, queryClient]);
}
