import useSWR from 'swr';

// Hook for fetching cart data
export function useCart() {
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data, error, mutate } = useSWR('/user/api/cart', fetcher, {
    revalidateOnFocus: true,
  });
  return { cart: data, isLoading: !error && !data, error, mutate };
} 