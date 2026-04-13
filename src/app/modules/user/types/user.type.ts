import type { Product } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

/** Price from Prisma `Decimal` or JSON/number at API boundaries. */
export type MoneyValue = number | Decimal | null;

/** Real aggregates from DB (reviews + paid order lines last 24h). */
export type StorefrontProductStats = {
  reviewCount: number;
  avgRating: number | null;
  soldLast24h: number;
};

/** Product row from list APIs; stats are present after `attachPublicListStats` (optional for stale cache). */
export type ProductCardProduct = Product & Partial<StorefrontProductStats>;

/** Product payload from `GET /products/[id]` (same stats shape as list). */
export type ProductDetailPayload = ProductCardProduct;

/** Cart line shape used in cart UI and domain summaries (not the API payload). */
export type CartItemRowData = {
  id: string;
  productId: number;
  quantity: number;
  title: string;
  price: MoneyValue;
  image?: string;
  liveProduct?: {
    price?: MoneyValue;
    title?: string;
    imageUrl?: string;
    stock?: number;
    isActive?: boolean;
  };
};

export type OrderListItem = {
  id: string;
  status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "fulfilled";
  total: number;
  currency?: string;
  paypalOrderId?: string;
  createdAt: string;
};

export type UserCartItem = {
  id: string;
  productId: number;
  quantity: number;
  title?: string | null;
  price?: MoneyValue;
  image?: string | null;
};

export type UserCart = {
  id: string;
  items: UserCartItem[];
} | null;
