import type { User } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import type { Product } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export type AuthResult = {
  user: SafeUser | null;
  error: string | null;
};

export type MoneyValue = number | Decimal | null;

export type StorefrontProductStats = {
  reviewCount: number;
  avgRating: number | null;
  soldLast24h: number;
};

export type ProductCardProduct = Product & Partial<StorefrontProductStats>;
export type ProductDetailPayload = ProductCardProduct;

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
