// Shared types for the admin analytics API response.
// Keeps dashboard and analytics pages aligned without duplicating local DTOs.
export type AdminAnalyticsTopProduct = {
  productId: number;
  quantity: number;
  product: { id: number; title: string; price: number } | null;
};

export type AdminAnalyticsRecentOrder = {
  id: number;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  emailSnapshot: string | null;
  user: { email: string | null; name: string | null } | null;
};

export type AdminAnalyticsSalesMonth = {
  month: string;
  label: string;
  revenue: number;
  orderCount: number;
};

export type AdminAnalyticsPayload = {
  revenueTotal: number;
  orderCount: number;
  userCount: number;
  productCount: number;
  topProducts: AdminAnalyticsTopProduct[];
  recentOrders: AdminAnalyticsRecentOrder[];
  salesByMonth: AdminAnalyticsSalesMonth[];
};
