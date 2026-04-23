import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { postLogout } from "@/app/lib/api/user";
import { USER_CART_QUERY_KEY } from "./useCart";

/**
 * logout helpers
 * clear server cookies then refresh the page
 */
export function useLogoutLight(onDone?: () => void) {
  const router = useRouter();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  return useCallback(async () => {
    await postLogout();
    router.refresh();
    onDoneRef.current?.();
  }, [router]);
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(
    async (e?: React.MouseEvent) => {
      // clear server auth and cart cookies, then invalidate client cache.
      e?.preventDefault();
      await postLogout();
      queryClient.invalidateQueries({ queryKey: ["user-session"] });
      queryClient.invalidateQueries({ queryKey: USER_CART_QUERY_KEY });
      await signOut({ callbackUrl: "/" });
      router.refresh();
    },
    [queryClient, router],
  );
}
