import type { Cart, CartLineItem } from "@prisma/client";

export type CartWithItems = Cart & { items: CartLineItem[] };
