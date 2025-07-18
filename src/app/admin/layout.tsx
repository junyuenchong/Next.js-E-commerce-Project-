// app/admin/layout.tsx
import { Inter } from "next/font/google";
import "../globals.css";
import Sidebar from "./components/layout/Sidebar/Sidebar";
import { SocketProvider } from '@/lib/socket/SocketContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Panel for managing content",
};

// This is a Server Component, so we cannot use useState.
// We'll use a hidden checkbox hack for mobile sidebar toggle.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <div className={`${inter.className} bg-white text-black min-h-screen antialiased`}>
           <Sidebar/>
        <main className="flex-1 md:ml-64 p-6 bg-gray-100 min-h-screen">
          {children}
        </main>
      </div>
    </SocketProvider>
  );
}
