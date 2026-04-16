import http from "@/app/utils/http";

const CART_API = "/features/user/api/cart";
const MERGE_API = "/features/user/api/products/cart/merge";

export type CartMutationBody = {
  action: "add" | "remove" | "update" | "clear";
  productId?: number;
  quantity?: number;
};

export async function fetchCart() {
  return (await http.get(CART_API)).data;
}

export async function postCartMutation(body: CartMutationBody) {
  return (await http.post(CART_API, body)).data;
}

export async function mergeGuestCart() {
  await http.post(MERGE_API);
}
