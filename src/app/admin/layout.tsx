// app/admin/layout.tsx
import { Inter } from "next/font/google";
import "../globals.css";
import Sidebar from "./components/layout/Sidebar/Sidebar";

// Prevent prerendering since admin pages require database access
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Panel for managing content",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-100 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
