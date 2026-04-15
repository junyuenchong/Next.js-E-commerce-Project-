import type { Metadata } from "next";
import "@/app/globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/auth";
import Header from "@/app/modules/user/components/client/layout/Header/Header";
import HeaderCategorySelector from "@/app/modules/user/components/client/layout/HeaderCategorySelector/HeaderCategorySelector";
import UserAppProvider from "@/app/providers/UserAppProvider";
import SupportChatWidget from "@/app/modules/user/components/client/support/SupportChatWidget";

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
  const session = await getServerSession(authOptions);
  return (
    <UserAppProvider session={session}>
      <Header categorySelector={<HeaderCategorySelector />} />
      {children}
      <SupportChatWidget />
    </UserAppProvider>
  );
};

export default UserLayout;
