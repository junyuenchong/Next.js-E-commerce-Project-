export type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

export const menuItems: MenuItem[] = [
  { label: "Home", href: "/features/user", icon: "🏠" },
  { label: "Cart", href: "/features/user/cart", icon: "🛒" },
  { label: "Orders", href: "/features/user/orders", icon: "📦" },
  { label: "Wishlist", href: "/features/user/wishlist", icon: "♥" },
];
