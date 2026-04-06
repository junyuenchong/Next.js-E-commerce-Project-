import { useQuery } from "@tanstack/react-query";

export function useCart() {
  const query = useQuery({
    queryKey: ["user-cart"],
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
