import { useEffect, useRef } from "react";
import type { AppDispatch } from "@/app/redux/store";
import { setCart, clearCart, setCartId } from "@/app/redux/store";
import type { QueryClient } from "@tanstack/react-query";
import { fetchCart, mergeGuestCart } from "@/app/lib/api/user";
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
  // Hook boundary: keeps cart state aligned with auth session transitions.
  // We merge the guest cart exactly once per user id after login.
  const mergedForUserId = useRef<string | number | null>(null);
  const prevUserId = useRef<string | number | null>(null);

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    const userId = data?.user?.id ?? null;

    const run = async () => {
      try {
        // If the user id changed (login/switch account), run merge once for the new user.
        if (userId != null && prevUserId.current !== userId) {
          prevUserId.current = userId;
          if (mergedForUserId.current !== userId) {
            mergedForUserId.current = userId;
            await mergeGuestCart();
          }
        }

        // Pull the latest server cart and hydrate Redux for consistent UI.
        const serverCart = await fetchCart();
        if (cancelled) return;
        const mapped = cartLinesFromApiPayload(serverCart);
        if (mapped) {
          dispatch(setCart(mapped.items));
          dispatch(setCartId(mapped.id));
        } else {
          dispatch(setCart([]));
          dispatch(setCartId(""));
        }

        void queryClient.invalidateQueries({ queryKey: USER_CART_QUERY_KEY });
      } catch {
        // Cart sync should never block the session flow; fall back to a safe empty cart.
        if (cancelled) return;
        dispatch(clearCart());
        dispatch(setCartId(""));
      }

      // When logged out, allow a future login to merge guest cart again.
      if (userId == null) {
        mergedForUserId.current = null;
        prevUserId.current = null;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [data?.user, isLoading, dispatch, queryClient]);
}
