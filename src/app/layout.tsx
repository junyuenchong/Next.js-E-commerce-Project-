// app/layout.tsx

import "./globals.css"; // <-- Import TailwindCSS (or your global styles)
import { Inter } from "next/font/google";
import ReduxProvider from './ReduxProvider';

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
    <html lang="en">
      <body className={`${inter.className} bg-white text-black min-h-screen antialiased`}>
        <ReduxProvider>
        {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
