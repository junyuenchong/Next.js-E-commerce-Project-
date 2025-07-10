import type { Metadata } from "next";
import "../globals.css";
import { Inter } from "next/font/google";

import Sidebar from "./components/layout/Sidebar/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin Panel for managing content",
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen flex`}>
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-100 overflow-auto">{children}</main>
      </body>
    </html>
  );
};

export default AdminLayout;
