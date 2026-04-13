import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import "@/app/globals.css";
import AdminSidebar from "@/app/modules/admin/client/components/layout/Sidebar/AdminSidebar";
import AdminMobileNav from "@/app/modules/admin/client/components/layout/Sidebar/AdminMobileNav";
import AdminProviders from "@/app/modules/admin/(main)/AdminProviders";
import { canAccessAdminPanel } from "@/backend/lib/auth";
import { getCurrentUser } from "@/backend/lib/session";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Panel for managing content",
};

/** Admin sidebar + session guard for pages in this group (URLs stay `/modules/admin/...`). */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.id || user.isActive === false) {
    redirect(
      "/modules/admin/auth/sign-in?returnUrl=" +
        encodeURIComponent("/modules/admin/dashboard"),
    );
  }
  if (!canAccessAdminPanel(user.role as UserRole)) {
    redirect("/modules/user");
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
