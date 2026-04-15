export type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

export const menuItems: MenuItem[] = [
  { label: "Home", href: "/modules/user", icon: "🏠" },
  { label: "Cart", href: "/modules/user/cart", icon: "🛒" },
  { label: "Orders", href: "/modules/user/orders", icon: "📦" },
  { label: "Wishlist", href: "/modules/user/wishlist", icon: "♥" },
];
