import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import "@/app/globals.css";
import AdminSidebar from "@/app/features/admin/components/client/layout/Sidebar/AdminSidebar";
import AdminMobileNav from "@/app/features/admin/components/client/layout/Sidebar/AdminMobileNav";
import AdminProviders from "@/app/providers/AdminProviders";
import { getCurrentAdminUser } from "@/backend/core/session";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Panel for managing content",
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAdminUser();
  if (!user?.id || user.isActive === false) {
    redirect(
      "/features/admin/auth/sign-in?returnUrl=" +
        encodeURIComponent("/features/admin/dashboard"),
    );
  }

  return (
    <div
      className={`${inter.className} bg-white text-black min-h-screen antialiased`}
    >
      <AdminMobileNav />
      <AdminSidebar />
      <AdminProviders>
        <main className="flex-1 md:ml-64 p-6 bg-gray-100 min-h-screen">
          {children}
        </main>
      </AdminProviders>
    </div>
  );
}
