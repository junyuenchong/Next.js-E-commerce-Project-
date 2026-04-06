import { useQuery } from "@tanstack/react-query";

// User cart hook: reads current cart state from the user cart API.
export function useCart() {
  const query = useQuery({
    queryKey: ["user-cart"],
    // Always read cart from API so guest/user state stays consistent.
    queryFn: async () => {
      const res = await fetch("/user/api/cart");
      return res.json();
    },
    refetchOnWindowFocus: true,
  });

  return {
    cart: query.data,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}
