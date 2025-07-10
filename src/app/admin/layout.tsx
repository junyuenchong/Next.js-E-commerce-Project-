// app/admin/layout.tsx
import { Inter } from "next/font/google";
import "../globals.css";
import Sidebar from "./components/layout/Sidebar/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Panel for managing content",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-white text-black min-h-screen antialiased">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-6 bg-gray-100 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}