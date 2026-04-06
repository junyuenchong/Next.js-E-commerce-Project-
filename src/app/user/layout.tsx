// app/layout.tsx or app/user/layout.tsx
import type { Metadata } from "next";
import "../globals.css";
import Header from "@/app/user/components/layout/Header/Header";
import HeaderCategorySelector from "./components/layout/HeaderCategorySelector/HeaderCategorySelector";
import UserLayoutClient from "./UserLayoutClient";
import { UserProvider } from "./UserContext";

export const metadata: Metadata = {
  title: {
    default: "CJY E-Commerce - Best Deals & Fast Delivery",
    template: "%s | CJY E-Commerce",
  },
  description:
    "Discover amazing products with up to 90% off. Free shipping on orders over RM 15. Fast delivery and excellent customer service.",
  keywords: [
    "e-commerce",
    "online shopping",
    "deals",
    "discounts",
    "free shipping",
    "Malaysia",
  ],
  openGraph: {
    title: "CJY E-Commerce - Best Deals & Fast Delivery",
    description:
      "Discover amazing products with up to 90% off. Free shipping on orders over RM 15.",
    type: "website",
  },
};

const UserLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <UserProvider>
      <UserLayoutClient>
        <Header categorySelector={<HeaderCategorySelector />} />
        {children}
      </UserLayoutClient>
    </UserProvider>
  );
};

export default UserLayout;
