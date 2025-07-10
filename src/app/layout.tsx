// app/layout.tsx

import { Inter } from "next/font/google";
import "./globals.css"; // <-- Import TailwindCSS (or your global styles)

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "E-Commerce",
  description: "Simple white layout with Next.js App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-white text-black min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
